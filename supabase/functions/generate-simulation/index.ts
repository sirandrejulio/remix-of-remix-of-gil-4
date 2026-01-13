import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const inputSchema = z.object({
  tipo: z.enum(['pratica', 'tematico', 'completo']).optional().default('pratica'),
  disciplina_id: z.string().uuid().or(z.literal('all')).optional().default('all'),
  quantidade: z.number().int().min(1).max(60).optional().default(10),
  motor: z.enum(['ia_principal', 'gemini', 'auto']).optional().default('auto'),
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
    
    const { tipo, disciplina_id, quantidade, motor } = parseResult.data;

    console.log(`Generating simulation: tipo=${tipo}, disciplina=${disciplina_id}, qtd=${quantidade}, motor=${motor}`);

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

    // Build query for questions from unified question bank
    // Only fetch validated questions (status_validacao = 'valida')
    let questoesQuery = supabase
      .from('questoes')
      .select(`
        *,
        disciplinas(id, nome)
      `)
      .eq('status_validacao', 'valida')
      .limit(quantidade * 3); // Get more for better randomization

    if (disciplina_id && disciplina_id !== 'all') {
      questoesQuery = questoesQuery.eq('disciplina_id', disciplina_id);
    }

    // Fetch existing questions
    const { data: questoes, error: questoesError } = await questoesQuery;

    if (questoesError) {
      throw new Error(`Error fetching questions: ${questoesError.message}`);
    }

    let finalQuestoes = questoes || [];

    // If not enough questions, generate with unified AI engine
    if (finalQuestoes.length < quantidade) {
      console.log(`Not enough questions (${finalQuestoes.length}/${quantidade}), generating with Unified AI...`);
      
      // Get discipline name
      let disciplinaNome = 'Conhecimentos Bancários';
      if (disciplina_id && disciplina_id !== 'all') {
        const { data: disciplina } = await supabase
          .from('disciplinas')
          .select('nome')
          .eq('id', disciplina_id)
          .maybeSingle();
        if (disciplina) {
          disciplinaNome = disciplina.nome;
        }
      }

      // Determine preferred engine
      const preferredEngine = motor === 'ia_principal' ? 'lovable' : motor === 'gemini' ? 'gemini' : undefined;
      const neededQuestions = quantidade - finalQuestoes.length;

      // Call unified AI engine
      const unifiedResponse = await fetch(
        `${supabaseUrl}/functions/v1/unified-ai-engine`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'generate_questions',
            systemPrompt: `Você é o BANCÁRIO ÁGIL, especialista em gerar questões para concursos bancários no padrão CESGRANRIO.

REGRAS:
- Gere questões INÉDITAS
- Padrão CESGRANRIO obrigatório
- 5 alternativas (A a E) com apenas 1 correta
- Distratores plausíveis
- Linguagem institucional

FORMATO JSON:
{
  "questoes": [
    {
      "enunciado": "texto da questão",
      "alternativas": {
        "A": "alternativa A",
        "B": "alternativa B",
        "C": "alternativa C",
        "D": "alternativa D",
        "E": "alternativa E"
      },
      "correta": "A",
      "disciplina": "${disciplinaNome}",
      "tema": "tema específico",
      "explicacao": "explicação da resposta"
    }
  ]
}`,
            prompt: `Gere ${neededQuestions} questões de ${disciplinaNome} para concurso do Banco do Brasil, padrão CESGRANRIO. Retorne APENAS o JSON.`,
            preferredEngine,
            context: { disciplina: disciplinaNome, quantidade: neededQuestions }
          }),
        }
      );

      if (unifiedResponse.ok) {
        const unifiedData = await unifiedResponse.json();
        console.log('Unified AI response:', { success: unifiedData.success, engine: unifiedData.engine, cached: unifiedData.cached });
        
        if (unifiedData.success && unifiedData.data?.questoes) {
          // Insert generated questions with correct column format
          const questoesToInsert = unifiedData.data.questoes.map((q: any) => ({
            enunciado: q.enunciado,
            alternativa_a: q.alternativas?.A || q.alternativa_a || '',
            alternativa_b: q.alternativas?.B || q.alternativa_b || '',
            alternativa_c: q.alternativas?.C || q.alternativa_c || '',
            alternativa_d: q.alternativas?.D || q.alternativa_d || '',
            alternativa_e: q.alternativas?.E || q.alternativa_e || '',
            resposta_correta: q.correta || q.resposta_correta,
            disciplina_id: disciplina_id !== 'all' ? disciplina_id : null,
            tema: q.tema || 'Geral',
            explicacao: q.explicacao,
            origem: 'API',
            status_validacao: 'valida',
            nivel: 'medio',
            banca: 'CESGRANRIO'
          }));

          const { data: insertedQuestoes, error: insertError } = await supabase
            .from('questoes')
            .insert(questoesToInsert)
            .select(`*, disciplinas(id, nome)`);

          if (insertError) {
            console.error('Error inserting generated questions:', insertError);
          } else if (insertedQuestoes) {
            finalQuestoes = [...finalQuestoes, ...insertedQuestoes];
            console.log(`Inserted ${insertedQuestoes.length} new questions from ${unifiedData.engine}`);
          }
        }
      } else {
        console.error('Unified AI error:', await unifiedResponse.text());
      }
    }

    if (finalQuestoes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma questão disponível para este simulado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Shuffle and limit questions
    const shuffled = finalQuestoes.sort(() => Math.random() - 0.5).slice(0, quantidade);

    // Create simulation record
    const { data: simulado, error: simuladoError } = await supabase
      .from('simulados')
      .insert({
        titulo: `Simulado ${tipo === 'tematico' ? 'Temático' : tipo === 'completo' ? 'Completo' : 'Prática'} - ${new Date().toLocaleDateString('pt-BR')}`,
        tipo,
        disciplina_filtro: disciplina_id !== 'all' ? disciplina_id : null,
        total_questoes: shuffled.length,
        user_id: userId,
        status: 'em_andamento',
      })
      .select()
      .single();

    if (simuladoError) {
      throw new Error(`Error creating simulation: ${simuladoError.message}`);
    }

    // Link questions to simulation
    const simuladoQuestoes = shuffled.map((q, index) => ({
      simulado_id: simulado.id,
      questao_id: q.id,
      ordem: index + 1,
    }));

    await supabase.from('simulado_questoes').insert(simuladoQuestoes);

    console.log(`Simulation created: ${simulado.id} with ${shuffled.length} questions`);

    return new Response(
      JSON.stringify({
        success: true,
        simulado_id: simulado.id,
        total_questoes: shuffled.length,
        questoes: shuffled,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Generate simulation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
