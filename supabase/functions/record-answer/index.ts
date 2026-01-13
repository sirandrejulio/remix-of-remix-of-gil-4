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
  questao_id: z.string().regex(uuidRegex, 'questao_id deve ser um UUID válido'),
  resposta: z.enum(['A', 'B', 'C', 'D', 'E'], { 
    errorMap: () => ({ message: 'Resposta deve ser A, B, C, D ou E' }) 
  }),
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
    
    const { simulado_id, questao_id, resposta } = parseResult.data;

    console.log(`Recording answer: simulado=${simulado_id}, questao=${questao_id}, resposta=${resposta}`);

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

    // Get correct answer for the question
    const { data: questao } = await supabase
      .from('questoes')
      .select('resposta_correta, disciplina_id, tema')
      .eq('id', questao_id)
      .single();

    if (!questao) {
      throw new Error('Questão não encontrada');
    }

    const estaCorreta = questao.resposta_correta === resposta;

    // Check if answer already exists
    const { data: existingResposta } = await supabase
      .from('respostas')
      .select('id')
      .eq('simulado_id', simulado_id)
      .eq('questao_id', questao_id)
      .maybeSingle();

    if (existingResposta) {
      // Update existing answer
      await supabase
        .from('respostas')
        .update({
          resposta_usuario: resposta,
          esta_correta: estaCorreta,
        })
        .eq('id', existingResposta.id);
    } else {
      // Insert new answer
      await supabase
        .from('respostas')
        .insert({
          simulado_id,
          questao_id,
          resposta_usuario: resposta,
          esta_correta: estaCorreta,
          user_id: userId,
        });
    }

    // If incorrect, log the error for analysis
    if (!estaCorreta && userId) {
      await supabase.from('erros_analise').insert({
        user_id: userId,
        questao_id,
        simulado_id,
        disciplina_id: questao.disciplina_id,
        tema: questao.tema,
      });
    }

    console.log(`Answer recorded: ${estaCorreta ? 'CORRECT' : 'INCORRECT'}`);

    return new Response(
      JSON.stringify({
        success: true,
        esta_correta: estaCorreta,
        resposta_correta: questao.resposta_correta,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Record answer error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
