import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const inputSchema = z.object({
  prompt: z.string().max(10000).optional(),
  type: z.string().max(50).optional(),
  disciplina: z.string().max(100).optional(),
  quantidade: z.number().int().min(1).max(60).optional().default(5),
  preferredEngine: z.enum(['lovable', 'gemini']).optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Configuração do Supabase ausente');
    }

    // Validate authentication using getClaims
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado - token ausente' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('JWT validation failed:', claimsError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Sessão inválida ou expirada' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', claimsData.claims.sub);

    const rawBody = await req.json();
    
    // Validate input
    const parseResult = inputSchema.safeParse(rawBody);
    if (!parseResult.success) {
      console.error('Validation error:', parseResult.error.issues);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Dados de entrada inválidos', 
          details: parseResult.error.issues.map(i => i.message) 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { prompt, type, disciplina, quantidade, preferredEngine } = parseResult.data;

    console.log('Gerando questões via Motor Unificado:', { type, disciplina, quantidade, preferredEngine });

    const systemPrompt = `Você é o BANCÁRIO ÁGIL, um sistema especializado em gerar questões para concursos do Banco do Brasil no estilo da banca CESGRANRIO.

REGRAS ABSOLUTAS:
- Gere questões INÉDITAS, nunca copie de provas reais
- Use APENAS o padrão CESGRANRIO
- Nível médio compatível com Banco do Brasil
- 5 alternativas (A a E) com apenas 1 correta
- Distratores plausíveis
- Linguagem institucional e formal

FORMATO DE RESPOSTA (JSON):
{
  "questoes": [
    {
      "enunciado": "texto da questão",
      "alternativas": {
        "A": "texto alternativa A",
        "B": "texto alternativa B",
        "C": "texto alternativa C",
        "D": "texto alternativa D",
        "E": "texto alternativa E"
      },
      "correta": "letra da alternativa correta",
      "disciplina": "nome da disciplina",
      "tema": "tema específico",
      "explicacao": "explicação breve da resposta correta"
    }
  ]
}`;

    const userPrompt = prompt || `Gere ${quantidade || 5} questões de ${disciplina || 'Conhecimentos Bancários'} para concurso do Banco do Brasil, seguindo rigorosamente o padrão CESGRANRIO.`;

    // Call unified AI engine
    const unifiedResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/unified-ai-engine`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate_questions',
          systemPrompt,
          prompt: userPrompt,
          preferredEngine: preferredEngine || 'gemini',
          context: { disciplina, quantidade }
        }),
      }
    );

    if (!unifiedResponse.ok) {
      const errorText = await unifiedResponse.text();
      console.error('Unified AI Engine error:', unifiedResponse.status, errorText);
      throw new Error(`Erro no Motor Unificado: ${unifiedResponse.status}`);
    }

    const data = await unifiedResponse.json();
    console.log('Resposta do Motor Unificado recebida:', { engine: data.engine, cached: data.cached });

    if (!data.success) {
      throw new Error(data.error || 'Erro desconhecido no Motor Unificado');
    }

    // Extract questions from response
    const questoes = data.data || { raw: data.content };

    return new Response(
      JSON.stringify({
        success: true,
        origem: data.engine?.toUpperCase() || 'UNIFIED',
        cached: data.cached,
        fallbackUsed: data.fallbackUsed,
        responseTimeMs: data.responseTimeMs,
        data: questoes
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro na função generate-gemini:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
