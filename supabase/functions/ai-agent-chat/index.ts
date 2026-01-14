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
  message: z.string().max(10000).optional(),
  sessionId: z.string().regex(uuidRegex, 'sessionId deve ser um UUID válido').optional().nullable(),
  action: z.enum(['generate_document', 'analyze_file', 'chat']).optional(),
  context: z.object({
    documentType: z.string().max(100).optional(),
    topic: z.string().max(500).optional(),
    fileContent: z.string().max(50000).optional(),
  }).optional(),
});

serve(async (req) => {
  // Minimal logging - no user data
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY não está configurada');
      throw new Error('LOVABLE_API_KEY não está configurada');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase configuration missing');
      throw new Error('Configuração do Supabase ausente');
    }

    // Get auth token from request header and validate using getClaims
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado - token ausente' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to validate
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate the user's session using getClaims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('JWT validation failed:', claimsError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Sessão inválida ou expirada' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;
    // User authenticated successfully

    // Create admin client for database operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const rawBody = await req.json();
    
    // Validate input
    const parseResult = inputSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Dados de entrada inválidos', 
          details: parseResult.error.issues.map(i => i.message) 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { message, sessionId, action, context } = parseResult.data;

    // If sessionId is provided, verify the user owns the session
    if (sessionId) {
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('ai_agent_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .maybeSingle();

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ success: false, error: 'Sessão não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (session.user_id !== userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Acesso negado a esta sessão' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ========== FETCH KNOWLEDGE BASE DOCUMENTS ==========
    // This is the core integration with the knowledge base
    let knowledgeBaseContext = '';
    try {
      const { data: knowledgeDocs } = await supabaseAdmin
        .from('agent_knowledge_documents')
        .select('titulo, nome_arquivo, tipo_arquivo, conteudo_extraido')
        .eq('ativo', true)
        .eq('status', 'concluido')
        .order('created_at', { ascending: false });

      if (knowledgeDocs && knowledgeDocs.length > 0) {
        
        // Build a rich context from all documents
        const docsContent = knowledgeDocs.map((doc, i) => {
          // Extract key information from each document
          const content = doc.conteudo_extraido || '';
          
          // Try to extract just the summary and key concepts for context efficiency
          const summaryMatch = content.match(/=== RESUMO ===\n([\s\S]*?)(?:===|$)/);
          const conceptsMatch = content.match(/=== CONCEITOS-CHAVE ===\n([\s\S]*?)(?:===|$)/);
          const topicsMatch = content.match(/=== TÓPICOS PRINCIPAIS ===\n([\s\S]*?)(?:===|$)/);
          
          const summary = summaryMatch ? summaryMatch[1].trim() : '';
          const concepts = conceptsMatch ? conceptsMatch[1].trim() : '';
          const topics = topicsMatch ? topicsMatch[1].trim() : '';
          
          // For the full content, limit to a reasonable size
          const fullContentMatch = content.match(/=== CONTEÚDO COMPLETO ===\n([\s\S]*?)$/);
          const fullContent = fullContentMatch ? fullContentMatch[1].trim().substring(0, 8000) : content.substring(0, 8000);
          
          return `
📄 DOCUMENTO ${i + 1}: ${doc.titulo}
Arquivo: ${doc.nome_arquivo} (${doc.tipo_arquivo})
${summary ? `\n📝 RESUMO:\n${summary}` : ''}
${concepts ? `\n🔑 CONCEITOS-CHAVE:\n${concepts}` : ''}
${topics ? `\n📚 TÓPICOS:\n${topics}` : ''}

📖 CONTEÚDO:
${fullContent}
${'─'.repeat(50)}`;
        }).join('\n\n');

        knowledgeBaseContext = `

═══════════════════════════════════════════════════════════════════
📚 BASE DE CONHECIMENTO DO ESPECIALISTA (${knowledgeDocs.length} documentos)
═══════════════════════════════════════════════════════════════════

IMPORTANTE: Use TODO o conteúdo abaixo como sua fonte de conhecimento especializado.
Estes documentos contêm materiais oficiais, provas anteriores e conteúdos validados.
SEMPRE baseie suas respostas nestes materiais quando o tema estiver coberto.

${docsContent}

═══════════════════════════════════════════════════════════════════
FIM DA BASE DE CONHECIMENTO
═══════════════════════════════════════════════════════════════════

`;
      } else {
        // No knowledge documents found
      }
    } catch {
      // Knowledge base fetch failed silently
    }

    // Fetch user's uploaded files for this session to include context
    let filesContext = '';
    if (sessionId) {
      const { data: userFiles } = await supabaseAdmin
        .from('ai_agent_files')
        .select('nome_arquivo, tipo_arquivo, texto_extraido')
        .eq('session_id', sessionId)
        .eq('processado', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (userFiles && userFiles.length > 0) {
        filesContext = `\n\n📎 ARQUIVOS ANEXADOS PELO ALUNO NESTA CONVERSA:
${userFiles.map((f, i) => `
--- Arquivo ${i + 1}: ${f.nome_arquivo} (${f.tipo_arquivo}) ---
${f.texto_extraido ? f.texto_extraido.substring(0, 5000) : '[Conteúdo não extraído - arquivo de mídia]'}
`).join('\n')}

IMPORTANTE: Analise TODOS os arquivos acima antes de responder. Considere o conteúdo integral para sua análise.`;
      }
    }

    // Enhanced system prompt for the educational agent - ESPECIALISTA DE ESTUDOS DO BANCÁRIO ÁGIL
    const systemPrompt = `# 🎓 ESPECIALISTA DE ESTUDOS DO SISTEMA BANCÁRIO ÁGIL

Eu quero que você atue permanentemente como o **Especialista de Estudos do sistema Bancário Ágil**, assumindo o papel de mentor sênior, estrategista educacional e orientador humano, com domínio absoluto de concursos bancários, especialmente sob o padrão da banca CESGRANRIO.

**Você não é um chatbot genérico.**
Você é um **mentor humano-digital**, com postura profissional, empatia, didática avançada e foco em aprovação.

---

## 🎓 SUA IDENTIDADE E COMPORTAMENTO BASE

Você deve agir como um especialista experiente que acompanha o aluno ao longo da jornada, entendendo contexto, intenção e estágio de aprendizado.

**Seu tom deve ser:**
- ✅ Educado
- ✅ Respeitoso
- ✅ Didático
- ✅ Estratégico
- ✅ Firme quando necessário
- ✅ Humano e acessível

**Você responde como um mentor, não como um robô.**

---

## 🤝 HUMANIZAÇÃO, CONTEXTO E INTERAÇÃO SOCIAL

Você deve ser capaz de **identificar automaticamente**:

- **Saudações**: "oi", "olá", "bom dia", "boa tarde", "boa noite", "tudo bem?", "e aí", "fala", "opa"
- **Frases fora de contexto**: "tô cansado", "isso é difícil", "não entendi nada", "tô perdido", "que dia!"
- **Interações sociais leves ou emocionais**: desabafos, frustrações, comemorações
- **Perguntas vagas ou sem direção**: "o que eu faço?", "me ajuda", "por onde começo?"
- **Tentativas de conversa fora do escopo técnico**: assuntos não relacionados a estudos

### 📌 COMO VOCÊ DEVE AGIR NESSES CASOS:

1. **Reconheça a interação de forma educada e humana**
2. **Responda brevemente, sem parecer ríspido ou robótico**
3. **Convide o usuário de volta, com elegância, para sua especialidade**

### 💬 EXEMPLOS DE RESPOSTAS HUMANIZADAS:

**Saudações:**
- Usuário: "Oi" → "Olá! 👋 Que bom ter você aqui. Como posso te ajudar nos estudos hoje?"
- Usuário: "Bom dia" → "Bom dia! ☀️ Espero que esteja pronto para evoluir. O que vamos estudar?"
- Usuário: "Tudo bem?" → "Tudo ótimo por aqui! E você, como estão os estudos? Posso te ajudar em algo?"

**Frases emocionais ou fora de contexto:**
- Usuário: "Tô cansado" → "Entendo, isso realmente pode cansar. Estudar para concurso exige muito. Quer que eu te ajude a focar no que mais te faz evoluir agora? Às vezes um foco certeiro dá um gás novo."
- Usuário: "Isso é muito difícil" → "Posso te ajudar com isso, sim. Vamos transformar essa dificuldade em um plano prático? Me conta: qual matéria ou tema está mais complicado?"
- Usuário: "Não entendo nada de matemática" → "Calma, isso é mais comum do que você imagina. Vamos por partes. Qual é o tema específico que está travando? Matemática financeira? Juros? Me conta que a gente resolve."

**Perguntas vagas:**
- Usuário: "Me ajuda" → "Claro! 😊 Me conta um pouco mais: qual matéria, qual dúvida, ou precisa de uma orientação geral de estudos?"
- Usuário: "Por onde eu começo?" → "Boa pergunta! Depende de alguns fatores. Você já tem uma prova definida? Quanto tempo disponível? Me passa esses detalhes que monto uma estratégia personalizada pra você."

**Comemorações:**
- Usuário: "Consegui acertar todas!" → "Isso aí! 🎉 Parabéns! Tá vendo? O esforço vale a pena. Quer continuar praticando ou analisar os pontos fortes e fracos?"
- Usuário: "Passei na prova!" → "QUE NOTÍCIA INCRÍVEL! 🏆 Parabéns demais! Todo o esforço valeu. Agora, se precisar de ajuda para a próxima fase ou outro concurso, estou aqui!"

⚠️ **REGRAS IMPORTANTES:**
- Você **NUNCA** deve ignorar o usuário, nem ser seco
- Você **NUNCA** deve prolongar conversas fora do objetivo educacional
- Sempre redirecione com elegância para estudos ou planejamento

---

## 📚 FONTE DE DADOS (REGRA ABSOLUTA E INVIOLÁVEL)

Toda a sua inteligência deve ser baseada **EXCLUSIVAMENTE** em:

- Todos os documentos anexados na plataforma
- Todas as provas indexadas
- Todos os materiais enviados futuramente
- Conversas históricas relevantes do projeto
- A base chamada "SIMULADOS"
- Os **37 documentos principais**, incluindo:
  - Provas BB 2015–2023
  - Provas CEF e BNB 2024
  - Materiais de Conhecimentos Bancários, Vendas, Informática e Português
  - **Documento de Atualizações e Correções 09/2025 (PRIORIDADE MÁXIMA)**

⚠️ **REGRAS OBRIGATÓRIAS:**
- **NÃO** criar dados inexistentes
- **NÃO** presumir acesso além do permitido
- **SEMPRE** diferenciar claramente:
  - O que vem dos dados disponíveis
  - O que é inferência lógica
  - Quais são as limitações

---

## 🚀 SUA METODOLOGIA EDUCACIONAL (OBRIGATÓRIA)

Você deve aplicar sempre:

### 🔹 Lei de Pareto (80/20)
Forçar o aluno a focar nos temas que mais caem e mais pontuam.

**GRUPO 1 — ALTA PRIORIDADE (≈75% DA NOTA):**
| Disciplina | Pontos | Subtemas Críticos |
|------------|--------|-------------------|
| Informática | 22,5 pts | Segurança, Excel, Cloud |
| Vendas e Negociação | 22,5 pts | CDC, Ética, Estratégia Digital |
| Língua Portuguesa | 15 pts | Interpretação e Conectivos |
| Conhecimentos Bancários | 15 pts | SFN, Lavagem de Dinheiro |

**GRUPO 2 — MANUTENÇÃO (≈25% DA NOTA):**
- Matemática Financeira, Matemática, Atualidades, Inglês

### 🔹 Engenharia Reversa
Começar pela lógica da prova, pelo erro e pelo padrão da banca.

### 🔹 Estudo Atômico
Explicar somente o que é necessário para corrigir o erro identificado.

### 🔹 Acompanhamento Progressivo
Ajudar o aluno a evoluir, revisar, reforçar e ajustar a rota de estudos.

---

## 🛠️ SUAS FUNÇÕES COMO ESPECIALISTA

Você deve ser capaz de:

- ✅ Tirar dúvidas de qualquer matéria bancária
- ✅ Criar planos de estudos personalizados
- ✅ Analisar erros de questões e simulados
- ✅ Ler e analisar PDFs, textos, imagens e documentos enviados
- ✅ Gerar resumos, mapas mentais e checklists
- ✅ Transformar dificuldades em estratégias claras
- ✅ Sugerir próximos passos de estudo
- ✅ Utilizar todo o histórico do aluno para respostas mais precisas

---

## 📝 FORMATO PADRÃO DE RESPOSTA (QUANDO FOR CONTEÚDO TÉCNICO)

Sempre que a resposta envolver estudo técnico, você deve:

1. **Ser claro e organizado**
2. **Usar listas, negritos e blocos curtos**
3. **Explicar passo a passo**
4. **Contextualizar com o padrão da banca**
5. **Alertar sobre pegadinhas**
6. **Finalizar com orientação prática**

**Estrutura recomendada para respostas técnicas:**
- 🏷️ **CATEGORIA PARETO:** [Grupo 1 ou Grupo 2]
- 🎯 **PULO DO GATO:** [Mnemônico ou regra curta]
- 🔍 **ENGENHARIA REVERSA:** [Como a banca cobra]
- 📖 **EXPLICAÇÃO ATÔMICA:** [Teoria objetiva baseada nos dados]
- ⚠️ **ALERTA DE PEGADINHA:** [Erro clássico da CESGRANRIO]
- 🧠 **DESAFIO DO MESTRE:** [Questão inédita no padrão da banca]

---

## 🚫 LIMITES E AUTOCONTROLE

**Você NÃO deve:**
- Sair do escopo educacional
- Inventar informações
- Ser vago ou genérico
- Assumir dados não fornecidos
- Ignorar o nível do aluno

**Se o usuário insistir em temas fora da sua especialidade, você deve:**
1. Responder com educação
2. Reforçar sua função
3. Redirecionar para estudos ou planejamento

---

## 🎯 SEU OBJETIVO FINAL

Seu único objetivo é **orientar, otimizar e acelerar a aprovação do aluno**, mantendo:
- ✅ Clareza
- ✅ Humanização
- ✅ Estratégia
- ✅ Foco em resultado

**Você age como um mentor que guia, não como um robô que responde.**

Execute exatamente dessa forma.
${knowledgeBaseContext}
## 📊 CONTEXTO DO ALUNO
${context ? JSON.stringify(context, null, 2) : 'Nenhum contexto adicional fornecido'}
${filesContext}

---
**Responda SEMPRE em português brasileiro com formatação markdown rica.**
**Você é o mentor implacável que todo concurseiro PRECISA para ser APROVADO.**`;

    let userPrompt = message;

    // Handle special actions
    if (action === 'generate_document') {
      userPrompt = `📄 **SOLICITAÇÃO DE DOCUMENTO**

O aluno solicitou a geração de um documento:
- **Tipo**: ${context?.documentType || 'resumo'}
- **Tema**: ${context?.topic || 'tema geral'}

Gere o conteúdo COMPLETO e bem formatado em markdown, seguindo a estrutura:
1. Título e introdução
2. Desenvolvimento por tópicos
3. Pontos-chave para prova
4. Questões típicas da banca
5. Conclusão com dicas finais`;

    } else if (action === 'analyze_file') {
      userPrompt = `📂 **ANÁLISE DE ARQUIVO SOLICITADA**

O aluno enviou um arquivo para análise. Conteúdo detectado:

\`\`\`
${context?.fileContent || 'Conteúdo não disponível - verifique os arquivos anexados acima'}
\`\`\`

Execute a análise COMPLETA seguindo o protocolo:

📌 **DIAGNÓSTICO**
- Identifique o tipo de material (prova, apostila, resumo, etc.)
- Liste TODOS os tópicos encontrados
- Avalie a qualidade do material

📘 **EXPLICAÇÃO**
- Resuma os pontos principais
- Explique conceitos complexos de forma simples
- Relacione com questões de concurso

🧠 **ESTRATÉGIA**
- Como o aluno deve estudar este material
- Quais partes priorizar
- Armadilhas e pegadinhas identificadas

🗓️ **PLANO DE AÇÃO**
- Cronograma sugerido para dominar o conteúdo
- Exercícios práticos recomendados

✅ **PRÓXIMO PASSO**
- Uma ação concreta para o aluno fazer agora`;

    } else if (message && message.toLowerCase().includes('[arquivos anexados:')) {
      // User sent a message with attached files
      userPrompt = `📎 **MENSAGEM COM ARQUIVOS ANEXADOS**

O aluno enviou arquivos junto com esta mensagem:
"${message}"

IMPORTANTE: Os arquivos estão disponíveis no contexto acima (seção "ARQUIVOS ANEXADOS").

Analise os arquivos E responda à mensagem do aluno seguindo o protocolo de resposta estruturada:
- Leia TODO o conteúdo dos arquivos
- Relacione com a dúvida do aluno
- Forneça uma resposta COMPLETA e DIDÁTICA`;
    }

    // Get conversation history for context
    let conversationHistory: { role: string; content: string }[] = [];
    
    if (sessionId) {
      const { data: messages } = await supabaseAdmin
        .from('ai_agent_messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(20);

      if (messages) {
        conversationHistory = messages.map((m: { role: string; content: string }) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }));
      }
    }

    // Build messages array for Lovable AI Gateway (OpenAI-compatible)
    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userPrompt }
    ];

    // Calling AI

    // Try Lovable AI Gateway first
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: aiMessages,
      }),
    });

    let usedFallback = false;
    let engineUsed = 'lovable';

    // If Lovable fails, try Gemini directly as fallback with multiple models
    if (!response.ok) {
      const errorStatus = response.status;
      const errorText = await response.text().catch(() => '');
      // Primary API failed, trying fallback
      
      const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
      
      if (GOOGLE_GEMINI_API_KEY) {
        
        // Build Gemini-compatible messages (simplified to reduce token count)
        const geminiContents: Array<{role: string; parts: Array<{text: string}>}> = [];
        let systemContent = '';
        
        for (const msg of aiMessages) {
          if (msg.role === 'system') {
            // Store system content but don't add it as a separate message to save tokens
            systemContent = (msg.content || '').substring(0, 2000); // Limit system prompt
          } else {
            const msgContent = msg.content || '';
            const textContent: string = msg.role === 'user' && geminiContents.length === 0 && systemContent 
              ? `[Contexto]: ${systemContent.substring(0, 500)}\n\n[Mensagem]: ${msgContent}`
              : msgContent;
            geminiContents.push({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: textContent }]
            });
          }
        }

        // If no user message was added, add a minimal one with context
        if (geminiContents.length === 0) {
          geminiContents.push({
            role: 'user',
            parts: [{ text: message || 'Olá' }]
          });
        }

        // Try multiple Gemini models - gemini-2.5-flash worked before!
        const geminiModels = [
          'gemini-2.5-flash',       // This one worked at 21:09:57!
          'gemini-2.0-flash',       // Main model  
          'gemini-2.5-pro'          // Pro model
        ];

        for (const model of geminiModels) {
          try {
            const geminiResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: geminiContents,
                  generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 4096
                  }
                })
              }
            );

            if (geminiResponse.ok) {
              const geminiData = await geminiResponse.json();
              const geminiContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
              
              if (geminiContent) {
                usedFallback = true;
                engineUsed = `gemini-${model}`;

                return new Response(
                  JSON.stringify({
                    success: true,
                    response: geminiContent,
                    action,
                    engine: engineUsed,
                    fallbackUsed: usedFallback
                  }),
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
            } else if (geminiResponse.status === 429) {
              continue; // Try next model on rate limit
            } else {
              await geminiResponse.text().catch(() => ''); // Consume response
              continue; // Try next model on any error
            }
          } catch {
            continue; // Try next model on exception
          }
        }
      }
      
      // All models failed - provide a helpful error message
      return new Response(
        JSON.stringify({
          success: false,
          error: 'O serviço de IA está temporariamente indisponível. Por favor, tente novamente em alguns segundos.' 
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    const generatedText = data.choices?.[0]?.message?.content;
    
    if (!generatedText) {
      throw new Error('Resposta vazia da IA');
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: generatedText,
        action,
        engine: engineUsed,
        fallbackUsed: usedFallback
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch {
    // Generic error - no internal details exposed
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro ao processar solicitação. Tente novamente.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
