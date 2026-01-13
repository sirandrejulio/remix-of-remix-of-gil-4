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
  fileId: z.string().regex(uuidRegex, 'fileId deve ser um UUID válido'),
  type: z.string().max(50).optional(),
  fileName: z.string().min(1).max(255),
  textoExtraido: z.string().max(100000).optional(), // Max 100k chars
});

interface ExtractedQuestion {
  enunciado: string;
  alternativa_a: string;
  alternativa_b: string;
  alternativa_c: string;
  alternativa_d: string;
  alternativa_e: string;
  resposta_correta: string;
  disciplina: string;
  tema: string;
  subtema?: string;
  nivel: 'facil' | 'medio' | 'dificil';
  banca: string;
  subpadrao_banca?: string;
  explicacao?: string;
  ano_referencia?: number;
}

interface ValidationResult {
  status: 'valida' | 'pendente' | 'invalida';
  motivo?: string;
  score_qualidade: number;
  nivel_confianca: 'alto' | 'medio' | 'baixo';
}

function validateQuestion(question: ExtractedQuestion): ValidationResult {
  const issues: string[] = [];
  let score = 100;

  // Verificar estrutura completa
  if (!question.enunciado || question.enunciado.trim().length < 20) {
    issues.push('Enunciado muito curto ou ausente');
    score -= 30;
  }

  // Verificar alternativas
  const alternatives = [
    question.alternativa_a,
    question.alternativa_b,
    question.alternativa_c,
    question.alternativa_d,
    question.alternativa_e
  ];

  const validAlternatives = alternatives.filter(alt => alt && alt.trim().length > 0);
  if (validAlternatives.length < 5) {
    issues.push(`Apenas ${validAlternatives.length} alternativas válidas de 5`);
    score -= (5 - validAlternatives.length) * 10;
  }

  // Verificar resposta correta
  const validAnswers = ['A', 'B', 'C', 'D', 'E'];
  if (!validAnswers.includes(question.resposta_correta?.toUpperCase())) {
    issues.push('Resposta correta inválida');
    score -= 40;
  }

  // Verificar se a alternativa da resposta correta existe
  const answerIndex = validAnswers.indexOf(question.resposta_correta?.toUpperCase());
  if (answerIndex >= 0 && (!alternatives[answerIndex] || alternatives[answerIndex].trim().length === 0)) {
    issues.push('Alternativa da resposta correta está vazia');
    score -= 30;
  }

  // Verificar disciplina e tema
  if (!question.disciplina || question.disciplina.trim().length === 0) {
    issues.push('Disciplina não identificada');
    score -= 10;
  }

  if (!question.tema || question.tema.trim().length === 0) {
    issues.push('Tema não identificado');
    score -= 10;
  }

  // Verificar banca
  if (!question.banca || question.banca.trim().length === 0) {
    issues.push('Banca não identificada');
    score -= 5;
  }

  // Verificar qualidade do enunciado (tamanho razoável)
  if (question.enunciado && question.enunciado.length > 50 && question.enunciado.length < 2000) {
    score += 5; // Bonus por enunciado bem formatado
  }

  // Verificar distratores (alternativas diferentes entre si)
  const uniqueAlternatives = new Set(alternatives.map(a => a?.toLowerCase().trim()));
  if (uniqueAlternatives.size < validAlternatives.length) {
    issues.push('Alternativas duplicadas detectadas');
    score -= 20;
  }

  // Limitar score entre 0 e 100
  score = Math.max(0, Math.min(100, score));

  // Determinar status e nível de confiança
  let status: 'valida' | 'pendente' | 'invalida' = 'valida';
  let nivel_confianca: 'alto' | 'medio' | 'baixo' = 'alto';

  if (score < 40) {
    status = 'invalida';
    nivel_confianca = 'baixo';
  } else if (score < 70) {
    status = 'pendente';
    nivel_confianca = 'medio';
  } else if (score < 85) {
    nivel_confianca = 'medio';
  }

  return {
    status,
    motivo: issues.length > 0 ? issues.join('; ') : undefined,
    score_qualidade: score,
    nivel_confianca
  };
}

async function extractQuestionsWithUnifiedAI(
  supabaseUrl: string,
  text: string, 
  fileName: string,
  bancaHint?: string
): Promise<{ questions: ExtractedQuestion[]; engine: string; cached: boolean }> {
  const systemPrompt = `Você é um especialista em extração de questões de concursos públicos bancários. Retorne apenas JSON válido.`;

  const userPrompt = `Analise o texto a seguir extraído de um documento de prova e extraia TODAS as questões encontradas.

Para cada questão, retorne um objeto JSON com a seguinte estrutura:
{
  "enunciado": "texto completo do enunciado",
  "alternativa_a": "texto da alternativa A",
  "alternativa_b": "texto da alternativa B",
  "alternativa_c": "texto da alternativa C",
  "alternativa_d": "texto da alternativa D",
  "alternativa_e": "texto da alternativa E",
  "resposta_correta": "A, B, C, D ou E (se identificável no documento)",
  "disciplina": "nome da disciplina (Português, Matemática, Conhecimentos Bancários, etc.)",
  "tema": "tema específico da questão",
  "subtema": "subtema se aplicável",
  "nivel": "facil, medio ou dificil",
  "banca": "${bancaHint || 'identificar a banca (CESGRANRIO, FCC, FGV, VUNESP, etc.)'}",
  "subpadrao_banca": "padrão específico da banca se identificável",
  "explicacao": "explicação da resposta se disponível",
  "ano_referencia": número do ano se identificável
}

REGRAS IMPORTANTES:
1. Extraia TODAS as questões do texto, mesmo que incompletas
2. Se não souber a resposta correta, deixe vazio ou use "?"
3. Identifique a banca pelo estilo e formatação
4. Classifique corretamente a disciplina baseado no conteúdo
5. Se houver numeração da questão, mantenha no início do enunciado
6. Retorne um array JSON válido com todas as questões

Nome do arquivo: ${fileName}

Texto para análise:
${text.substring(0, 30000)}

Retorne APENAS o array JSON, sem explicações adicionais.`;

  try {
    console.log('Calling Unified AI Engine for question extraction...');
    
    const response = await fetch(`${supabaseUrl}/functions/v1/unified-ai-engine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'extract_questions',
        systemPrompt,
        prompt: userPrompt,
        context: { fileName, banca: bancaHint }
      })
    });

    if (!response.ok) {
      console.error('Unified AI error:', response.status, await response.text());
      return { questions: [], engine: 'none', cached: false };
    }

    const data = await response.json();
    
    if (!data.success) {
      console.error('Unified AI failed:', data.error);
      return { questions: [], engine: 'none', cached: false };
    }

    const responseText = data.content || '';
    const engine = data.engine || 'unified';
    const cached = data.cached || false;

    // Extrair JSON do response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array found in response');
      return { questions: [], engine, cached };
    }

    const questions = JSON.parse(jsonMatch[0]) as ExtractedQuestion[];
    console.log(`Extracted ${questions.length} questions using ${engine} (cached: ${cached})`);
    return { questions, engine, cached };

  } catch (error) {
    console.error('Error extracting questions:', error);
    return { questions: [], engine: 'error', cached: false };
  }
}

async function getDisciplinaId(supabase: any, disciplinaNome: string): Promise<string | null> {
  // Mapeamento de nomes comuns para nomes na base
  const disciplinaMap: Record<string, string> = {
    'português': 'Língua Portuguesa',
    'portugues': 'Língua Portuguesa',
    'língua portuguesa': 'Língua Portuguesa',
    'matematica': 'Matemática Financeira',
    'matemática': 'Matemática Financeira',
    'matemática financeira': 'Matemática Financeira',
    'raciocínio lógico': 'Matemática Financeira',
    'conhecimentos bancários': 'Conhecimentos Bancários',
    'conhecimentos bancarios': 'Conhecimentos Bancários',
    'atualidades': 'Atualidades do Mercado Financeiro',
    'atualidades do mercado financeiro': 'Atualidades do Mercado Financeiro',
    'informática': 'Informática',
    'informatica': 'Informática',
    'inglês': 'Língua Inglesa',
    'ingles': 'Língua Inglesa',
    'língua inglesa': 'Língua Inglesa',
    'vendas': 'Vendas e Negociação',
    'vendas e negociação': 'Vendas e Negociação',
    'negociação': 'Vendas e Negociação',
  };

  const normalizedName = disciplinaNome.toLowerCase().trim();
  const mappedName = disciplinaMap[normalizedName] || disciplinaNome;

  const { data } = await supabase
    .from('disciplinas')
    .select('id')
    .ilike('nome', `%${mappedName}%`)
    .limit(1)
    .maybeSingle();

  return data?.id || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

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

    console.log('Authenticated user:', claimsData.claims.sub);

    const supabase = createClient(supabaseUrl, supabaseKey);

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
    
    const { fileId, type, fileName, textoExtraido } = parseResult.data;

    console.log(`Processing upload: ${fileName} (${type || 'unknown'}) - ID: ${fileId}`);

    let questoesExtraidas = 0;
    let engineUsed = 'none';
    let wasCached = false;

    // Se temos texto extraído, processar com Motor Unificado
    if (textoExtraido && textoExtraido.length > 100) {
      // Detectar banca pelo nome do arquivo
      let bancaHint = '';
      const fileNameLower = fileName.toLowerCase();
      if (fileNameLower.includes('cesgranrio')) bancaHint = 'CESGRANRIO';
      else if (fileNameLower.includes('fcc')) bancaHint = 'FCC';
      else if (fileNameLower.includes('fgv')) bancaHint = 'FGV';
      else if (fileNameLower.includes('vunesp')) bancaHint = 'VUNESP';

      // Extrair questões com Motor Unificado
      const { questions: extractedQuestions, engine, cached } = await extractQuestionsWithUnifiedAI(
        supabaseUrl,
        textoExtraido, 
        fileName,
        bancaHint
      );

      engineUsed = engine;
      wasCached = cached;

      // Processar e salvar cada questão
      for (const question of extractedQuestions) {
        try {
          // Validar questão
          const validation = validateQuestion(question);

          // Obter ID da disciplina
          const disciplinaId = await getDisciplinaId(supabase, question.disciplina);

          // Inserir questão no banco
          const { error: insertError } = await supabase
            .from('questoes')
            .insert({
              enunciado: question.enunciado,
              alternativa_a: question.alternativa_a || '',
              alternativa_b: question.alternativa_b || '',
              alternativa_c: question.alternativa_c || '',
              alternativa_d: question.alternativa_d || '',
              alternativa_e: question.alternativa_e || '',
              resposta_correta: question.resposta_correta?.toUpperCase() || '?',
              disciplina_id: disciplinaId,
              tema: question.tema || 'Geral',
              subtema: question.subtema,
              nivel: question.nivel || 'medio',
              banca: question.banca || bancaHint || 'CESGRANRIO',
              subpadrao_banca: question.subpadrao_banca,
              explicacao: question.explicacao,
              ano_referencia: question.ano_referencia,
              origem: `UNIFIED_${engineUsed.toUpperCase()}`,
              status_validacao: validation.status,
              motivo_validacao: validation.motivo,
              score_qualidade: validation.score_qualidade,
              nivel_confianca: validation.nivel_confianca,
              documento_origem: fileId
            });

          if (insertError) {
            console.error('Error inserting question:', insertError);
          } else {
            questoesExtraidas++;
          }
        } catch (questionError) {
          console.error('Error processing question:', questionError);
        }
      }

      // Detectar temas do documento
      const temasDetectados = [...new Set(extractedQuestions.map(q => q.tema).filter(Boolean))];
      console.log(`Detected themes: ${temasDetectados.join(', ')}`);
    }

    console.log(`Successfully processed: ${fileName} - ${questoesExtraidas} questions extracted using ${engineUsed} (cached: ${wasCached})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Arquivo processado com sucesso',
        questoesExtraidas,
        engine: engineUsed,
        cached: wasCached
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Process upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
