import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// UUID regex for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Input validation schema
const inputSchema = z.object({
  simulado_id: z.string().regex(uuidRegex, 'simulado_id deve ser um UUID válido'),
  respostas: z.array(z.object({
    questao_id: z.string().regex(uuidRegex).optional(),
    resposta: z.enum(['A', 'B', 'C', 'D', 'E']).optional(),
  })).max(100).optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    
    // Validate input
    const parseResult = inputSchema.safeParse(rawBody);
    if (!parseResult.success) {
      console.error('Validation error:', parseResult.error.issues);
      return new Response(
        JSON.stringify({ 
          error: 'Dados de entrada inválidos', 
          details: parseResult.error.issues.map(i => i.message) 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { simulado_id, respostas } = parseResult.data;

    console.log(`Finishing simulation: ${simulado_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate authentication using getClaims
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Não autorizado - token ausente' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('JWT validation failed:', claimsError?.message);
      return new Response(
        JSON.stringify({ error: 'Sessão inválida ou expirada' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log('Authenticated user:', userId);

    // Get simulation details
    const { data: simulado } = await supabase
      .from('simulados')
      .select('*, simulado_questoes(questao_id, ordem)')
      .eq('id', simulado_id)
      .single();

    if (!simulado) {
      throw new Error('Simulado não encontrado');
    }

    // Get all answers for this simulation
    const { data: allRespostas } = await supabase
      .from('respostas')
      .select('*, questoes(disciplina_id, tema)')
      .eq('simulado_id', simulado_id);

    // Calculate results
    const totalQuestoes = simulado.simulado_questoes?.length || 0;
    const totalAcertos = allRespostas?.filter((r) => r.esta_correta).length || 0;
    const taxaAcerto = totalQuestoes > 0 ? (totalAcertos / totalQuestoes) * 100 : 0;

    // Update simulation status
    await supabase
      .from('simulados')
      .update({
        status: 'finalizado',
        data_fim: new Date().toISOString(),
      })
      .eq('id', simulado_id);

    // Update user performance by discipline
    if (userId) {
      const performanceByDisciplina = new Map<string, { acertos: number; total: number }>();

      allRespostas?.forEach((r) => {
        const discId = r.questoes?.disciplina_id;
        if (discId) {
          const current = performanceByDisciplina.get(discId) || { acertos: 0, total: 0 };
          current.total++;
          if (r.esta_correta) current.acertos++;
          performanceByDisciplina.set(discId, current);
        }
      });

      for (const [disciplinaId, stats] of performanceByDisciplina) {
        const taxa = (stats.acertos / stats.total) * 100;

        // Upsert performance
        const { data: existing } = await supabase
          .from('performance')
          .select('*')
          .eq('user_id', userId)
          .eq('disciplina_id', disciplinaId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('performance')
            .update({
              total_questoes: existing.total_questoes + stats.total,
              total_acertos: existing.total_acertos + stats.acertos,
              taxa_acerto: ((existing.total_acertos + stats.acertos) / (existing.total_questoes + stats.total)) * 100,
              ultima_atividade: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('performance').insert({
            user_id: userId,
            disciplina_id: disciplinaId,
            total_questoes: stats.total,
            total_acertos: stats.acertos,
            taxa_acerto: taxa,
          });
        }
      }
    }

    // Create notification for the user (with deduplication check)
    if (userId) {
      // Check if notification for this simulation already exists
      const { data: existingNotif } = await supabase
        .from('admin_notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', `simulado_concluido_${simulado_id}`)
        .limit(1)
        .maybeSingle();

      if (!existingNotif) {
        const severity = taxaAcerto >= 70 ? 'success' : taxaAcerto >= 50 ? 'warning' : 'info';
        const message = taxaAcerto >= 70 
          ? `Parabéns! Você acertou ${totalAcertos} de ${totalQuestoes} questões (${Math.round(taxaAcerto)}%). Excelente desempenho!`
          : taxaAcerto >= 50
          ? `Você acertou ${totalAcertos} de ${totalQuestoes} questões (${Math.round(taxaAcerto)}%). Continue praticando!`
          : `Você acertou ${totalAcertos} de ${totalQuestoes} questões (${Math.round(taxaAcerto)}%). Foque mais nas disciplinas do Grupo 1!`;

        await supabase.from('admin_notifications').insert({
          user_id: userId,
          type: `simulado_concluido_${simulado_id}`, // Unique per simulation to prevent duplicates
          title: '🎯 Simulado Concluído!',
          message: message,
          severity: severity,
          action_url: '/dashboard',
        });

        console.log(`Notification created for user: ${userId}`);
      } else {
        console.log(`Notification already exists for simulation ${simulado_id}, skipping`);
      }
    }

    console.log(`Simulation finished: ${totalAcertos}/${totalQuestoes} (${taxaAcerto.toFixed(1)}%)`);

    return new Response(
      JSON.stringify({
        success: true,
        resultado: {
          total_questoes: totalQuestoes,
          total_acertos: totalAcertos,
          taxa_acerto: Math.round(taxaAcerto * 10) / 10,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Finish simulation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
