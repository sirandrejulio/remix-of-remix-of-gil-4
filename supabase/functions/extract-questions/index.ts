import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedQuestion {
  id: string;
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
  explicacao?: string;
  ano_referencia?: number;
  score_qualidade: number;
  nivel_confianca: 'alto' | 'medio' | 'baixo';
  issues: string[];
}

const BANCAS_CONHECIDAS = [
  'CESGRANRIO', 'FCC', 'FGV', 'CESPE', 'CEBRASPE', 'VUNESP', 'IBFC', 
  'FUNDATEC', 'AOCP', 'CONSULPLAN', 'IDECAN', 'FADESP', 'FEPESE',
  'FUNCAB', 'IADES', 'INSTITUTO ACESSO', 'FUNDEP', 'COPESE'
];

function detectBancaFromText(text: string, fileName: string): string {
  const sample = (fileName + ' ' + text.substring(0, 5000)).toUpperCase();
  
  for (const banca of BANCAS_CONHECIDAS) {
    if (sample.includes(banca)) return banca;
  }
  
  if (sample.includes('BANCO DO BRASIL')) return 'CESGRANRIO';
  if (sample.includes('CAIXA')) return 'CESGRANRIO';
  
  return 'Não identificada';
}

function detectYearFromText(text: string, fileName: string): number | undefined {
  const sample = fileName + ' ' + text.substring(0, 3000);
  const match = sample.match(/\b(20[0-2]\d)\b/);
  return match ? parseInt(match[1]) : undefined;
}

// Lista de disciplinas disponíveis no banco para matching
const DISCIPLINAS_CONHECIDAS: { nome: string; keywords: string[] }[] = [
  { 
    nome: 'Conhecimentos Bancários', 
    keywords: ['bancário', 'banco', 'crédito', 'operações bancárias', 'sistema financeiro nacional', 'sfn', 'bacen', 'cvm', 'tesouro', 'títulos públicos', 'capital de giro', 'spread', 'compulsório', 'open market', 'selic', 'copom']
  },
  { 
    nome: 'Matemática Financeira', 
    keywords: ['juros simples', 'juros compostos', 'montante', 'taxa de juros', 'desconto', 'amortização', 'prestação', 'sac', 'price', 'valor presente', 'valor futuro', 'vpn', 'tir', 'capitalização', 'equivalência']
  },
  { 
    nome: 'Matemática', 
    keywords: ['equação', 'função', 'álgebra', 'geometria', 'trigonometria', 'derivada', 'integral', 'logaritmo', 'exponencial', 'progressão', 'matriz', 'determinante']
  },
  { 
    nome: 'Probabilidade e Estatística', 
    keywords: ['probabilidade', 'estatística', 'média', 'mediana', 'moda', 'desvio padrão', 'variância', 'distribuição', 'amostra', 'frequência', 'combinatória', 'permutação', 'arranjo', 'binomial']
  },
  { 
    nome: 'Informática', 
    keywords: ['computador', 'software', 'hardware', 'internet', 'navegador', 'windows', 'linux', 'word', 'excel', 'powerpoint', 'rede', 'segurança da informação', 'virus', 'firewall', 'backup', 'sistema operacional']
  },
  { 
    nome: 'Tecnologia da Informação', 
    keywords: ['ti', 'programação', 'banco de dados', 'sql', 'algoritmo', 'lgpd', 'governança de ti', 'itil', 'cobit', 'cloud', 'virtualização', 'devops', 'api', 'microsserviços', 'containers']
  },
  { 
    nome: 'Vendas e Negociação', 
    keywords: ['vendas', 'negociação', 'cliente', 'atendimento', 'relacionamento', 'marketing', 'mercado', 'produto', 'serviço', 'fidelização', 'prospecção', 'pós-venda', 'cross-selling', 'up-selling', 'crm']
  },
  { 
    nome: 'Língua Portuguesa', 
    keywords: ['gramática', 'ortografia', 'sintaxe', 'morfologia', 'semântica', 'texto', 'redação', 'interpretação', 'coesão', 'coerência', 'concordância', 'regência', 'pontuação', 'crase', 'verbo', 'pronome']
  },
  { 
    nome: 'Língua Inglesa', 
    keywords: ['english', 'inglês', 'vocabulary', 'grammar', 'reading', 'comprehension', 'verb', 'noun', 'adjective', 'translation']
  }
];

// Detectar disciplina a partir do texto do enunciado, tema e nome do arquivo
function detectDisciplinaFromContent(enunciado: string, tema: string, fileName: string): string {
  const textToAnalyze = (fileName + ' ' + tema + ' ' + enunciado).toLowerCase();
  
  let bestMatch: { nome: string; score: number } = { nome: 'Não identificada', score: 0 };
  
  for (const disciplina of DISCIPLINAS_CONHECIDAS) {
    let score = 0;
    
    for (const keyword of disciplina.keywords) {
      if (textToAnalyze.includes(keyword.toLowerCase())) {
        score += keyword.length > 5 ? 3 : 2; // Keywords maiores têm mais peso
      }
    }
    
    // Bonus se o nome da disciplina aparecer diretamente
    if (textToAnalyze.includes(disciplina.nome.toLowerCase())) {
      score += 10;
    }
    
    if (score > bestMatch.score) {
      bestMatch = { nome: disciplina.nome, score };
    }
  }
  
  // Só retorna se tiver um score mínimo de confiança
  return bestMatch.score >= 2 ? bestMatch.nome : 'Não identificada';
}

function validateQuestion(q: any): { score: number; issues: string[]; confidence: 'alto' | 'medio' | 'baixo' } {
  const issues: string[] = [];
  let score = 100;

  if (!q.enunciado || q.enunciado.length < 15) {
    issues.push('Enunciado curto');
    score -= 30;
  }

  const alts = [q.alternativa_a, q.alternativa_b, q.alternativa_c, q.alternativa_d, q.alternativa_e];
  const valid = alts.filter(a => a && a.trim().length > 0).length;
  if (valid < 3) {
    issues.push(`${5 - valid} alternativa(s) ausente(s)`);
    score -= (5 - valid) * 12;
  }

  const answer = (q.resposta_correta || '').toUpperCase().trim();
  if (!['A', 'B', 'C', 'D', 'E'].includes(answer)) {
    if (answer === '?') {
      issues.push('Gabarito não identificado');
      score -= 10;
    } else {
      issues.push('Resposta inválida');
      score -= 25;
    }
  }

  score = Math.max(0, Math.min(100, score));
  const confidence = score >= 70 ? 'alto' : score >= 45 ? 'medio' : 'baixo';

  return { score, issues, confidence };
}

// Clean and normalize text for better extraction
function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\u00A0/g, ' ') // non-breaking space
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars except newline
    .replace(/  +/g, ' ')
    .replace(/\n +/g, '\n')
    .replace(/ +\n/g, '\n')
    .trim();
}

// Extract TEMA from question block - supports multiple formats
function extractTemaFromBlock(block: string): { tema: string; subtema?: string } {
  // Pattern 1: "TEMA: Juros Simples/Cálculo do Montante" or "TEMA: Juros Simples - Cálculo"
  const temaPatterns = [
    /TEMA:\s*([^\n]+)/i,
    /Tema:\s*([^\n]+)/i,
    /ASSUNTO:\s*([^\n]+)/i,
    /Assunto:\s*([^\n]+)/i,
    /MATÉRIA:\s*([^\n]+)/i,
    /CONTEÚDO:\s*([^\n]+)/i,
    /TÓPICO:\s*([^\n]+)/i,
  ];
  
  for (const pattern of temaPatterns) {
    const match = block.match(pattern);
    if (match) {
      const fullTema = match[1].trim();
      
      // Check if contains subtema separated by / or -
      if (fullTema.includes('/')) {
        const parts = fullTema.split('/').map(p => p.trim()).filter(p => p.length > 0);
        if (parts.length >= 2) {
          return {
            tema: parts[0],
            subtema: parts.slice(1).join('/')
          };
        }
        return { tema: parts[0] || 'Geral' };
      }
      
      // Try separator with " - "
      if (fullTema.includes(' - ')) {
        const parts = fullTema.split(' - ').map(p => p.trim()).filter(p => p.length > 0);
        if (parts.length >= 2) {
          return {
            tema: parts[0],
            subtema: parts.slice(1).join(' - ')
          };
        }
        return { tema: parts[0] || 'Geral' };
      }
      
      // Try separator with ":"
      if (fullTema.includes(':') && !fullTema.startsWith(':')) {
        const parts = fullTema.split(':').map(p => p.trim()).filter(p => p.length > 0);
        if (parts.length >= 2) {
          return {
            tema: parts[0],
            subtema: parts.slice(1).join(':')
          };
        }
      }
      
      return { tema: fullTema };
    }
  }
  
  // Pattern 2: Try to infer tema from keywords in first lines
  const firstLines = block.split('\n').slice(0, 5).join(' ').toLowerCase();
  
  const temaKeywords: { keyword: string; tema: string }[] = [
    { keyword: 'juros simples', tema: 'Juros Simples' },
    { keyword: 'juros compostos', tema: 'Juros Compostos' },
    { keyword: 'desconto', tema: 'Descontos' },
    { keyword: 'amortização', tema: 'Amortização' },
    { keyword: 'montante', tema: 'Montante' },
    { keyword: 'taxa de juros', tema: 'Taxas de Juros' },
    { keyword: 'porcentagem', tema: 'Porcentagem' },
    { keyword: 'probabilidade', tema: 'Probabilidade' },
    { keyword: 'estatística', tema: 'Estatística' },
    { keyword: 'média', tema: 'Medidas de Tendência Central' },
    { keyword: 'sistema financeiro', tema: 'Sistema Financeiro Nacional' },
    { keyword: 'banco central', tema: 'Banco Central' },
    { keyword: 'bacen', tema: 'Banco Central' },
    { keyword: 'operações bancárias', tema: 'Operações Bancárias' },
    { keyword: 'crédito', tema: 'Operações de Crédito' },
    { keyword: 'interpretação de texto', tema: 'Interpretação de Texto' },
    { keyword: 'gramática', tema: 'Gramática' },
    { keyword: 'concordância', tema: 'Concordância' },
    { keyword: 'regência', tema: 'Regência' },
    { keyword: 'crase', tema: 'Crase' },
    { keyword: 'pontuação', tema: 'Pontuação' },
    { keyword: 'excel', tema: 'Excel' },
    { keyword: 'word', tema: 'Word' },
    { keyword: 'windows', tema: 'Windows' },
    { keyword: 'internet', tema: 'Internet' },
    { keyword: 'segurança da informação', tema: 'Segurança da Informação' },
    { keyword: 'hardware', tema: 'Hardware' },
    { keyword: 'software', tema: 'Software' },
    { keyword: 'rede', tema: 'Redes de Computadores' },
    { keyword: 'atendimento', tema: 'Atendimento ao Cliente' },
    { keyword: 'vendas', tema: 'Vendas' },
    { keyword: 'negociação', tema: 'Negociação' },
    { keyword: 'marketing', tema: 'Marketing' },
    { keyword: 'fidelização', tema: 'Fidelização de Clientes' },
  ];
  
  for (const item of temaKeywords) {
    if (firstLines.includes(item.keyword)) {
      return { tema: item.tema };
    }
  }
  
  return { tema: 'Geral' };
}

/**
 * ═══════════════════════════════════════════════════════════════
 * ESTRATÉGIA PRINCIPAL: Formato Estruturado
 * ═══════════════════════════════════════════════════════════════
 * 
 * PADRÃO 1 (Simples - sem BANCA/ANO):
 *   QUESTÃO X
 *   TEMA: Cartões de Crédito / Crédito Rotativo
 *   Enunciado: texto da questão...
 *   Alternativas:
 *   A texto da alternativa A
 *   B texto da alternativa B
 *   ...
 *   GABARITO: B
 *   ---
 * 
 * PADRÃO 2 (Completo - com BANCA/ANO):
 *   QUESTÃO X
 *   BANCA: CESGRANRIO
 *   ANO: 2018
 *   TEMA: Juros Compostos / Rentabilidade
 *   Enunciado: texto da questão...
 *   Alternativas:
 *   (A) texto da alternativa A
 *   (B) texto da alternativa B
 *   ...
 *   GABARITO: B
 *   ---
 */
function extractByStructuredFormat(text: string): any[] {
  const questions: any[] = [];
  
  // Split by "QUESTÃO X" ou separador "---"
  const questionBlocks = text.split(/(?=QUEST[ÃA]O\s*\d+)|(?:^|\n)---+(?:\n|$)/i)
    .filter(b => b.trim().length > 50);
  
  console.log(`[StructuredFormat] Encontrados ${questionBlocks.length} blocos potenciais`);
  
  for (const block of questionBlocks) {
    // Detecta número da questão
    const numMatch = block.match(/QUEST[ÃA]O\s*(\d+)/i);
    const numero = numMatch ? parseInt(numMatch[1]) : undefined;
    
    // PADRÃO 2: Extrai BANCA (opcional)
    let banca = 'Não identificada';
    const bancaMatch = block.match(/BANCA:\s*([^\n]+)/i);
    if (bancaMatch) {
      banca = bancaMatch[1].trim();
    }
    
    // PADRÃO 2: Extrai ANO (opcional)
    let ano: number | undefined;
    const anoMatch = block.match(/ANO:\s*(\d{4})/i);
    if (anoMatch) {
      ano = parseInt(anoMatch[1]);
    }
    
    // AMBOS PADRÕES: Extrai TEMA (obrigatório)
    const { tema, subtema } = extractTemaFromBlock(block);
    
    // AMBOS PADRÕES: Extrai Enunciado
    const enunciadoMatch = block.match(/Enunciado:\s*([\s\S]*?)(?=Alternativas?:|$)/i);
    if (!enunciadoMatch) {
      console.log(`[StructuredFormat] Bloco sem "Enunciado:" - pulando`);
      continue;
    }
    
    const enunciado = enunciadoMatch[1].trim();
    if (enunciado.length < 15) {
      console.log(`[StructuredFormat] Enunciado muito curto (${enunciado.length} chars) - pulando`);
      continue;
    }
    
    // AMBOS PADRÕES: Extrai Alternativas
    const alternativasMatch = block.match(/Alternativas?:\s*([\s\S]*?)(?=GABARITO:|Resposta:|$)/i);
    if (!alternativasMatch) {
      console.log(`[StructuredFormat] Bloco sem "Alternativas:" - pulando`);
      continue;
    }
    
    const altsText = alternativasMatch[1];
    const alts: Record<string, string> = {};
    
    // PADRÃO 2: "(A) texto" - com parênteses
    const altPatternParen = /\(([A-E])\)\s*([^\n]+)/gi;
    let match;
    while ((match = altPatternParen.exec(altsText)) !== null) {
      const letter = match[1].toUpperCase();
      if (!alts[letter]) {
        alts[letter] = match[2].trim().replace(/\.$/, '');
      }
    }
    
    // PADRÃO 1: "A texto" - sem parênteses (apenas letra + espaço)
    if (Object.keys(alts).length < 3) {
      const lines = altsText.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        // Match: "A texto" ou "A) texto" ou "A. texto"
        const simpleMatch = trimmedLine.match(/^([A-E])[\s\)\.]+(.+)$/i);
        if (simpleMatch) {
          const letter = simpleMatch[1].toUpperCase();
          if (!alts[letter]) {
            let altText = simpleMatch[2].trim().replace(/\.$/, '');
            if (altText.length > 0) {
              alts[letter] = altText;
            }
          }
        }
      }
    }
    
    if (Object.keys(alts).length < 3) {
      console.log(`[StructuredFormat] Apenas ${Object.keys(alts).length} alternativas encontradas - pulando`);
      continue;
    }
    
    // AMBOS PADRÕES: Extrai GABARITO
    let resposta = '?';
    const gabaritoMatch = block.match(/GABARITO:\s*([A-E])/i);
    if (gabaritoMatch) {
      resposta = gabaritoMatch[1].toUpperCase();
    }
    
    // Detecta qual padrão foi usado
    const formato = (bancaMatch || anoMatch) ? 'padrao2' : 'padrao1';
    
    console.log(`[StructuredFormat] ✓ Q${numero || '?'}: tema="${tema}", banca="${banca}", ano=${ano || 'N/A'}, formato=${formato}, gabarito=${resposta}`);
    
    questions.push({
      enunciado,
      alternativa_a: alts['A'] || '',
      alternativa_b: alts['B'] || '',
      alternativa_c: alts['C'] || '',
      alternativa_d: alts['D'] || '',
      alternativa_e: alts['E'] || '',
      resposta_correta: resposta,
      tema,
      subtema,
      banca,
      ano_referencia: ano,
      numero,
      formato
    });
  }
  
  return questions;
}

// Strategy for text that starts with "Enunciado:" pattern (legacy)
function extractByLabeledFormat(text: string): any[] {
  const questions: any[] = [];
  
  // First try structured format
  const structured = extractByStructuredFormat(text);
  if (structured.length > 0) {
    return structured;
  }
  
  // Fallback: Pattern: "Enunciado: ... Alternativas: A texto B texto..."
  const enunciadoMatch = text.match(/Enunciado:\s*([\s\S]*?)(?:Alternativas?:|$)/i);
  const alternativasMatch = text.match(/Alternativas?:\s*([\s\S]*?)(?:Gabarito:|Resposta:|$)/i);
  
  // Try to extract TEMA even in legacy format
  const { tema, subtema } = extractTemaFromBlock(text);
  
  if (enunciadoMatch && alternativasMatch) {
    const enunciado = enunciadoMatch[1].trim();
    const altsText = alternativasMatch[1];
    
    // Extract alternatives - format: "A texto. B texto. C texto."
    const alts: Record<string, string> = {};
    
    // Try multiple patterns
    const patterns = [
      /([A-E])\s+([^A-E\n]{10,}?)(?=\s*[A-E]\s+[A-ZÀ-Ú]|$)/gi,
      /([A-E])\s*[\.\)]\s*([^\n]+)/gi,
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(altsText)) !== null) {
        const letter = match[1].toUpperCase();
        if (!alts[letter]) {
          alts[letter] = match[2].trim().replace(/\.$/, '');
        }
      }
      if (Object.keys(alts).length >= 3) break;
    }
    
    // If still not found, try splitting by letter
    if (Object.keys(alts).length < 3) {
      const parts = altsText.split(/(?=\b[A-E]\s+[A-ZÀ-Ú])/);
      for (const part of parts) {
        const m = part.match(/^([A-E])\s+(.+)/s);
        if (m) {
          alts[m[1].toUpperCase()] = m[2].trim().replace(/\.$/, '');
        }
      }
    }
    
    console.log(`Labeled format - Found ${Object.keys(alts).length} alternatives, tema: "${tema}"`);
    
    if (enunciado.length > 15 && Object.keys(alts).length >= 3) {
      // Look for answer
      let resposta = '?';
      const respMatch = text.match(/(?:Gabarito|Resposta)[:\s]*([A-E])/i);
      if (respMatch) resposta = respMatch[1].toUpperCase();
      
      questions.push({
        enunciado,
        alternativa_a: alts['A'] || '',
        alternativa_b: alts['B'] || '',
        alternativa_c: alts['C'] || '',
        alternativa_d: alts['D'] || '',
        alternativa_e: alts['E'] || '',
        resposta_correta: resposta,
        tema,
        subtema
      });
    }
  }
  
  return questions;
}

// Enhanced question extraction with multiple strategies
function extractQuestionsWithRegex(text: string): any[] {
  const normalizedText = normalizeText(text);
  console.log(`Normalized text length: ${normalizedText.length}`);
  console.log(`Text sample (first 500 chars): ${normalizedText.substring(0, 500)}`);
  
  const questions: any[] = [];
  
  // Strategy 0: Try labeled format first (Enunciado: ... Alternativas: ...)
  const strategy0 = extractByLabeledFormat(normalizedText);
  console.log(`Strategy 0 (labeled format): ${strategy0.length} questions`);
  questions.push(...strategy0);
  
  // Strategy 1: Split by question number patterns and extract
  if (questions.length === 0) {
    const strategy1 = extractByQuestionNumbers(normalizedText);
    console.log(`Strategy 1 (question numbers): ${strategy1.length} questions`);
    questions.push(...strategy1);
  }
  
  // Strategy 2: Look for alternative patterns
  if (questions.length === 0) {
    const strategy2 = extractByAlternativeBlocks(normalizedText);
    console.log(`Strategy 2 (alternative blocks): ${strategy2.length} questions`);
    questions.push(...strategy2);
  }
  
  // Strategy 3: Split by double newlines and analyze blocks
  if (questions.length === 0) {
    const strategy3 = extractByTextBlocks(normalizedText);
    console.log(`Strategy 3 (text blocks): ${strategy3.length} questions`);
    questions.push(...strategy3);
  }
  
  return questions;
}

// Strategy 1: Extract questions by number patterns (1., 01., QUESTÃO 1, etc.)
function extractByQuestionNumbers(text: string): any[] {
  const questions: any[] = [];
  
  // Find all question start positions
  const questionStarts: { index: number; num: number }[] = [];
  
  // Pattern: "1." or "1)" or "01." at start of line
  const numPattern = /(?:^|\n)\s*(\d{1,3})\s*[\.\)]\s*(?=[A-ZÀ-Ú])/gm;
  let match;
  while ((match = numPattern.exec(text)) !== null) {
    questionStarts.push({ index: match.index, num: parseInt(match[1]) });
  }
  
  // Pattern: "QUESTÃO 1" or "Questão 01"
  const questaoPattern = /(?:QUEST[ÃA]O|Quest[ãa]o)\s*(\d{1,3})/gi;
  while ((match = questaoPattern.exec(text)) !== null) {
    questionStarts.push({ index: match.index, num: parseInt(match[1]) });
  }
  
  // Sort by position
  questionStarts.sort((a, b) => a.index - b.index);
  
  // Remove duplicates (same position)
  const uniqueStarts = questionStarts.filter((item, idx, arr) => 
    idx === 0 || item.index !== arr[idx - 1].index
  );
  
  console.log(`Found ${uniqueStarts.length} question start positions`);
  
  // Extract each question
  for (let i = 0; i < uniqueStarts.length; i++) {
    const start = uniqueStarts[i].index;
    const end = i < uniqueStarts.length - 1 
      ? uniqueStarts[i + 1].index 
      : Math.min(start + 3000, text.length);
    
    const block = text.substring(start, end);
    const question = parseQuestionBlock(block);
    
    if (question && question.enunciado && question.enunciado.length > 15) {
      questions.push(question);
    }
  }
  
  return questions;
}

// Strategy 2: Find blocks with alternatives (A), (B), (C), (D), (E)
function extractByAlternativeBlocks(text: string): any[] {
  const questions: any[] = [];
  
  // Multiple patterns for different alternative formats
  const altPatterns = [
    /[\(\s]A\s*[\)\.][\s\S]{1,200}[\(\s]B\s*[\)\.][\s\S]{1,200}[\(\s]C\s*[\)\.]/gi,
    // NEW: Pattern for "A texto\nB texto\nC texto" without parentheses
    /\nA\s+[A-ZÀ-Ú][^\n]+\n+B\s+[A-ZÀ-Ú][^\n]+\n+C\s+[A-ZÀ-Ú]/gi,
  ];
  
  for (const altPattern of altPatterns) {
    let match;
    while ((match = altPattern.exec(text)) !== null) {
      // Look backwards for question start
      const searchStart = Math.max(0, match.index - 1500);
      const preText = text.substring(searchStart, match.index);
      const postText = text.substring(match.index, Math.min(match.index + 2000, text.length));
      
      const fullBlock = preText + postText;
      const question = parseQuestionBlock(fullBlock);
      
      if (question && question.enunciado && question.enunciado.length > 15) {
        questions.push(question);
      }
    }
  }
  
  return questions;
}

// Strategy 3: Split by paragraphs and analyze
function extractByTextBlocks(text: string): any[] {
  const questions: any[] = [];
  const blocks = text.split(/\n\s*\n/).filter(b => b.trim().length > 50);
  
  let currentEnunciado = '';
  let currentAlts: Record<string, string> = {};
  
  for (const block of blocks) {
    // Check if block has alternatives
    const hasAlts = /[(\s][A-E]\s*[)\.]/.test(block);
    
    if (hasAlts) {
      const question = parseQuestionBlock(block);
      if (question && question.enunciado && question.enunciado.length > 15) {
        questions.push(question);
      }
    }
  }
  
  return questions;
}

// Parse a text block to extract question components
function parseQuestionBlock(block: string): any | null {
  const question: any = {
    enunciado: '',
    alternativa_a: '',
    alternativa_b: '',
    alternativa_c: '',
    alternativa_d: '',
    alternativa_e: '',
    resposta_correta: '?',
    tema: 'Geral',
    subtema: undefined
  };
  
  // Extract TEMA/SUBTEMA from block first
  const { tema, subtema } = extractTemaFromBlock(block);
  question.tema = tema;
  question.subtema = subtema;
  
  // Extract alternatives with multiple patterns
  const altPatterns = [
    // (A) text or ( A ) text
    /\(\s*([A-E])\s*\)\s*([^\n\(]+)/gi,
    // A) text
    /(?:^|\n)\s*([A-E])\s*\)\s*([^\n]+)/gm,
    // A. text
    /(?:^|\n)\s*([A-E])\s*\.\s*([^\n]+)/gm,
    // a) text (lowercase)
    /(?:^|\n)\s*([a-e])\s*\)\s*([^\n]+)/gm,
    // NEW: "A texto" - just letter followed by space and text (common in some formats)
    /(?:^|\n)\s*([A-E])\s+([A-ZÀ-Ú][^\n]{5,})/gm,
  ];
  
  const foundAlts: Map<string, string> = new Map();
  let firstAltPosition = block.length;
  
  for (const pattern of altPatterns) {
    let match;
    while ((match = pattern.exec(block)) !== null) {
      const letter = match[1].toUpperCase();
      const text = match[2].trim();
      if (!foundAlts.has(letter) && text.length > 0) {
        foundAlts.set(letter, text);
        if (match.index < firstAltPosition) {
          firstAltPosition = match.index;
        }
      }
    }
  }
  
  // If we found alternatives, extract enunciado from before them
  if (foundAlts.size >= 3) {
    let enunciado = block.substring(0, firstAltPosition).trim();
    
    // Remove question number prefix
    enunciado = enunciado
      .replace(/^\s*\d{1,3}\s*[\.\)]\s*/m, '')
      .replace(/^QUEST[ÃA]O\s*\d{1,3}[:\.\s]*/i, '')
      // Remove TEMA line from enunciado
      .replace(/TEMA:\s*[^\n]+\n?/i, '')
      .trim();
    
    // Clean up enunciado
    enunciado = enunciado.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    
    if (enunciado.length > 15) {
      question.enunciado = enunciado;
      question.alternativa_a = foundAlts.get('A') || '';
      question.alternativa_b = foundAlts.get('B') || '';
      question.alternativa_c = foundAlts.get('C') || '';
      question.alternativa_d = foundAlts.get('D') || '';
      question.alternativa_e = foundAlts.get('E') || '';
      
      // Try to find answer
      const answerMatch = block.match(/(?:GABARITO|RESPOSTA|CORRETA?)[:\s]*([A-E])/i) ||
                         block.match(/\*\s*([A-E])\s*\*/i) ||
                         block.match(/LETRA\s+([A-E])/i);
      
      if (answerMatch) {
        question.resposta_correta = answerMatch[1].toUpperCase();
      }
      
      return question;
    }
  }
  
  return null;
}

// Try to extract gabarito from text
function extractGabarito(text: string): Map<number, string> {
  const gabarito = new Map<number, string>();
  
  // Look for gabarito section
  const gabaritoPatterns = [
    /GABARITO[\s\S]*?(?=\n\s*\n|$)/gi,
    /RESPOSTAS?[\s\S]*?(?=\n\s*\n|$)/gi,
    /CHAVE DE CORRE[ÇC][ÃA]O[\s\S]*?(?=\n\s*\n|$)/gi,
  ];
  
  for (const pattern of gabaritoPatterns) {
    const sections = text.match(pattern) || [];
    for (const section of sections) {
      // Pattern: "1-A", "1.A", "1)A", "01 - A", "1: A", etc
      const matches = section.matchAll(/(\d{1,3})\s*[-\.\):]\s*([A-E])/gi);
      for (const match of matches) {
        gabarito.set(parseInt(match[1]), match[2].toUpperCase());
      }
    }
  }
  
  // Also look for inline patterns in full text
  const inlineMatches = text.matchAll(/(?:quest[ãa]o|q\.?)\s*(\d{1,3})[:\s-]*([A-E])/gi);
  for (const match of inlineMatches) {
    if (!gabarito.has(parseInt(match[1]))) {
      gabarito.set(parseInt(match[1]), match[2].toUpperCase());
    }
  }
  
  // Look for simple numbered answer patterns
  const simpleMatches = text.matchAll(/(?:^|\n)\s*(\d{1,3})\s*[-–]\s*([A-E])\s*(?:$|\n)/gm);
  for (const match of simpleMatches) {
    if (!gabarito.has(parseInt(match[1]))) {
      gabarito.set(parseInt(match[1]), match[2].toUpperCase());
    }
  }
  
  return gabarito;
}

function deduplicateQuestions(questions: ExtractedQuestion[]): ExtractedQuestion[] {
  const seen = new Map<string, ExtractedQuestion>();
  
  for (const q of questions) {
    // Use first 60 chars of normalized enunciado as key
    const key = q.enunciado.toLowerCase().replace(/\s+/g, ' ').trim().substring(0, 60);
    if (key.length < 15) continue;
    
    if (!seen.has(key) || q.score_qualidade > (seen.get(key)?.score_qualidade || 0)) {
      seen.set(key, q);
    }
  }
  
  return Array.from(seen.values());
}

// Input validation constants
const MAX_TEXT_LENGTH = 2_000_000; // 2MB text limit
const MIN_TEXT_LENGTH = 50;
const MAX_FILENAME_LENGTH = 255;

// Sanitize filename to prevent injection
function sanitizeFileName(fileName: string): string {
  if (!fileName) return 'unknown';
  return fileName.slice(0, MAX_FILENAME_LENGTH).replace(/[^\w\s\-\.]/g, '_');
}

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
      return new Response(
        JSON.stringify({ success: false, error: 'Sessão inválida ou expirada' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body with size check
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Corpo da requisição inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { text, fileName } = requestBody;

    // Validate text input
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Texto é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (text.length < MIN_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ success: false, error: 'Texto muito curto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ success: false, error: 'Texto muito grande. Máximo 2MB.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize filename
    const safeFileName = sanitizeFileName(fileName || 'document');

    const banca = detectBancaFromText(text, safeFileName);
    const ano = detectYearFromText(text, safeFileName);

    // Extract gabarito first
    const gabarito = extractGabarito(text);

    // Extract questions using multiple strategies (FREE)
    const rawQuestions = extractQuestionsWithRegex(text);

    // Apply gabarito to questions
    rawQuestions.forEach((q, idx) => {
      const questionNum = idx + 1;
      if (gabarito.has(questionNum) && q.resposta_correta === '?') {
        q.resposta_correta = gabarito.get(questionNum)!;
      }
    });

    // Validate and format
    const validated: ExtractedQuestion[] = rawQuestions.map(q => {
      const v = validateQuestion(q);
      
      let resp = (q.resposta_correta || '?').toUpperCase().trim();
      if (!['A', 'B', 'C', 'D', 'E', '?'].includes(resp)) resp = '?';
      
      // Use tema/subtema from extraction if available
      const extractedTema = q.tema && q.tema !== 'Geral' ? q.tema : 'Geral';
      const extractedSubtema = q.subtema || undefined;
      
      // Detectar disciplina automaticamente baseado no conteúdo
      const detectedDisciplina = detectDisciplinaFromContent(
        q.enunciado || '', 
        extractedTema, 
        safeFileName
      );
      
      return {
        id: crypto.randomUUID(),
        enunciado: (q.enunciado || '').trim().slice(0, 10000), // Limit enunciado length
        alternativa_a: (q.alternativa_a || '').trim().slice(0, 2000),
        alternativa_b: (q.alternativa_b || '').trim().slice(0, 2000),
        alternativa_c: (q.alternativa_c || '').trim().slice(0, 2000),
        alternativa_d: (q.alternativa_d || '').trim().slice(0, 2000),
        alternativa_e: (q.alternativa_e || '').trim().slice(0, 2000),
        resposta_correta: resp,
        disciplina: detectedDisciplina,
        tema: extractedTema.slice(0, 200),
        subtema: extractedSubtema?.slice(0, 200),
        nivel: 'medio' as const,
        banca: banca.slice(0, 100),
        explicacao: '',
        ano_referencia: ano,
        score_qualidade: v.score,
        nivel_confianca: v.confidence,
        issues: v.issues
      };
    });

    // Remove duplicates and low quality
    const unique = deduplicateQuestions(validated);
    const final = unique.filter(q => q.score_qualidade >= 20 && q.enunciado.length > 15);

    if (final.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nenhuma questão válida encontrada. O texto extraído pode estar corrompido. Tente converter o PDF para TXT antes de fazer upload.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const withGabarito = final.filter(q => q.resposta_correta !== '?').length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        questions: final,
        stats: {
          total: final.length,
          gabarito_identified: withGabarito,
          with_explanation: 0,
          avg_quality: Math.round(final.reduce((s, q) => s + q.score_qualidade, 0) / final.length),
          extraction_method: 'regex_free'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Generic error message - no internal details exposed
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro na extração. Tente novamente.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
