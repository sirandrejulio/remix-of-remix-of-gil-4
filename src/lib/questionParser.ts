/**
 * Parser de Questões - Reconhece múltiplos padrões de formatação
 * 
 * PADRÃO 1 (Simples):
 * QUESTÃO X
 * TEMA: Cartões de Crédito / Crédito Rotativo
 * Enunciado: texto...
 * Alternativas:
 * A texto
 * B texto
 * ...
 * GABARITO: B
 * 
 * PADRÃO 2 (Completo):
 * QUESTÃO X
 * BANCA: CESGRANRIO
 * ANO: 2018
 * TEMA: Juros Compostos / Rentabilidade
 * Enunciado: texto...
 * Alternativas:
 * (A) texto
 * (B) texto
 * ...
 * GABARITO: B
 */

export type QuestionFormat = 'padrao1' | 'padrao2' | 'desconhecido';
export type ConfidenceLevel = 'alto' | 'medio' | 'baixo';

export interface ParsedQuestion {
  numero?: number;
  banca?: string;
  ano_referencia?: number;
  tema: string;
  subtema?: string;
  enunciado: string;
  alternativa_a: string;
  alternativa_b: string;
  alternativa_c: string;
  alternativa_d: string;
  alternativa_e: string;
  resposta_correta: string;
  confidence: ConfidenceLevel;
  format: QuestionFormat;
}

export interface ParseResult {
  success: boolean;
  questions: ParsedQuestion[];
  errors: string[];
  stats: {
    total: number;
    padrao1: number;
    padrao2: number;
    comGabarito: number;
    semGabarito: number;
  };
}

/**
 * Detecta qual padrão a questão segue
 */
function detectBlockFormat(block: string): QuestionFormat {
  const hasBanca = /BANCA:\s*\w+/i.test(block);
  const hasAno = /ANO:\s*\d{4}/i.test(block);
  const hasTema = /TEMA:\s*[^\n]+/i.test(block);
  const hasEnunciado = /Enunciado:\s*/i.test(block);
  const hasAlternativas = /Alternativas?:/i.test(block);
  
  // Padrão 2: tem BANCA e ANO explícitos
  if (hasBanca && hasAno && hasTema) {
    return 'padrao2';
  }
  
  // Padrão 1: tem TEMA mas sem BANCA/ANO
  if (hasTema && hasEnunciado && hasAlternativas) {
    return 'padrao1';
  }
  
  // Se tem estrutura básica mas não identificamos o padrão específico
  if (hasEnunciado || hasAlternativas) {
    return 'padrao1'; // Assume padrão mais simples
  }
  
  return 'desconhecido';
}

/**
 * Extrai tema e subtema de uma linha "TEMA: Principal / Secundário"
 */
function extractTema(block: string): { tema: string; subtema?: string } {
  const temaMatch = block.match(/TEMA:\s*([^\n]+)/i);
  
  if (!temaMatch) {
    return { tema: 'Geral' };
  }
  
  const fullTema = temaMatch[1].trim();
  
  // Separadores: " / " ou " - " ou " : "
  const separators = [' / ', ' - ', ': '];
  
  for (const sep of separators) {
    if (fullTema.includes(sep)) {
      const parts = fullTema.split(sep).map(p => p.trim()).filter(p => p.length > 0);
      if (parts.length >= 2) {
        return {
          tema: parts[0],
          subtema: parts.slice(1).join(sep)
        };
      }
    }
  }
  
  return { tema: fullTema };
}

/**
 * Extrai alternativas de um bloco de texto
 * Suporta formatos:
 * - A texto
 * - (A) texto
 * - a) texto
 */
function extractAlternatives(altsText: string): Record<string, string> {
  const alts: Record<string, string> = {};
  
  // Padrão 1: (A) texto ou (a) texto
  const parenPattern = /\(([A-Ea-e])\)\s*([^\n]+)/g;
  let match;
  
  while ((match = parenPattern.exec(altsText)) !== null) {
    const letter = match[1].toUpperCase();
    if (!alts[letter]) {
      alts[letter] = match[2].trim().replace(/\.$/, '');
    }
  }
  
  // Padrão 2: A texto ou a) texto (sem parênteses)
  if (Object.keys(alts).length < 3) {
    // Procura linhas que começam com letra + espaço ou letra + )
    const lines = altsText.split('\n');
    
    for (const line of lines) {
      const simpleMatch = line.match(/^([A-Ea-e])[\s\)\.]+(.+)$/);
      if (simpleMatch) {
        const letter = simpleMatch[1].toUpperCase();
        if (!alts[letter]) {
          alts[letter] = simpleMatch[2].trim().replace(/\.$/, '');
        }
      }
    }
  }
  
  // Padrão 3: Alternativas inline separadas por letra maiúscula
  if (Object.keys(alts).length < 3) {
    const inlinePattern = /(?:^|\s)([A-E])\s+([^A-E\n]{5,}?)(?=\s+[A-E]\s+|$)/gi;
    while ((match = inlinePattern.exec(altsText)) !== null) {
      const letter = match[1].toUpperCase();
      if (!alts[letter]) {
        alts[letter] = match[2].trim().replace(/\.$/, '');
      }
    }
  }
  
  return alts;
}

/**
 * Parseia uma questão individual de um bloco de texto
 */
function parseQuestionBlock(block: string): ParsedQuestion | null {
  const format = detectBlockFormat(block);
  
  if (format === 'desconhecido' && block.length < 100) {
    return null;
  }
  
  // Extrai número da questão
  const numMatch = block.match(/QUEST[ÃA]O\s*(\d+)/i);
  const numero = numMatch ? parseInt(numMatch[1]) : undefined;
  
  // Extrai BANCA (Padrão 2)
  const bancaMatch = block.match(/BANCA:\s*([^\n]+)/i);
  const banca = bancaMatch ? bancaMatch[1].trim() : undefined;
  
  // Extrai ANO (Padrão 2)
  const anoMatch = block.match(/ANO:\s*(\d{4})/i);
  const ano_referencia = anoMatch ? parseInt(anoMatch[1]) : undefined;
  
  // Extrai TEMA
  const { tema, subtema } = extractTema(block);
  
  // Extrai Enunciado
  let enunciado = '';
  const enunciadoMatch = block.match(/Enunciado:\s*([\s\S]*?)(?=Alternativas?:|$)/i);
  
  if (enunciadoMatch) {
    enunciado = enunciadoMatch[1].trim();
  } else {
    // Tenta extrair texto após TEMA: até encontrar alternativas
    const afterTema = block.match(/TEMA:[^\n]*\n([\s\S]*?)(?=Alternativas?:|(?:^|\n)[A-E][\s\)\.]+)/i);
    if (afterTema) {
      enunciado = afterTema[1].trim();
    }
  }
  
  if (!enunciado || enunciado.length < 15) {
    return null;
  }
  
  // Extrai Alternativas
  let altsText = '';
  const altsMatch = block.match(/Alternativas?:\s*([\s\S]*?)(?=GABARITO:|Resposta:|$)/i);
  
  if (altsMatch) {
    altsText = altsMatch[1];
  } else {
    // Tenta encontrar bloco de alternativas por padrão de letras
    const altBlockMatch = block.match(/(?:^|\n)([A-E][\s\)\.]+[\s\S]*?)(?=GABARITO:|Resposta:|$)/i);
    if (altBlockMatch) {
      altsText = altBlockMatch[1];
    }
  }
  
  const alts = extractAlternatives(altsText);
  
  if (Object.keys(alts).length < 3) {
    return null;
  }
  
  // Extrai GABARITO
  let resposta = '?';
  const gabaritoMatch = block.match(/GABARITO:\s*([A-E])/i);
  if (gabaritoMatch) {
    resposta = gabaritoMatch[1].toUpperCase();
  } else {
    // Tenta outros padrões
    const respostaMatch = block.match(/Resposta(?:\s*correta)?:\s*([A-E])/i);
    if (respostaMatch) {
      resposta = respostaMatch[1].toUpperCase();
    }
  }
  
  // Calcula confiança
  let confidence: ConfidenceLevel = 'alto';
  
  if (resposta === '?') {
    confidence = 'baixo';
  } else if (Object.keys(alts).length < 5 || !tema || tema === 'Geral') {
    confidence = 'medio';
  }
  
  return {
    numero,
    banca,
    ano_referencia,
    tema,
    subtema,
    enunciado,
    alternativa_a: alts['A'] || '',
    alternativa_b: alts['B'] || '',
    alternativa_c: alts['C'] || '',
    alternativa_d: alts['D'] || '',
    alternativa_e: alts['E'] || '',
    resposta_correta: resposta,
    confidence,
    format
  };
}

/**
 * Divide o texto em blocos de questões individuais
 */
function splitIntoQuestionBlocks(text: string): string[] {
  // Normaliza o texto
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/  +/g, ' ')
    .trim();
  
  // Primeiro tenta dividir por separador "---"
  if (normalized.includes('---')) {
    const blocks = normalized.split(/\n---+\n/).filter(b => b.trim().length > 50);
    if (blocks.length > 1) {
      return blocks;
    }
  }
  
  // Depois tenta dividir por "QUESTÃO X"
  const questionPattern = /(?=QUEST[ÃA]O\s*\d+)/gi;
  const blocks = normalized.split(questionPattern).filter(b => b.trim().length > 50);
  
  if (blocks.length > 1) {
    return blocks;
  }
  
  // Se não encontrou divisões, retorna o texto todo como um bloco
  return [normalized];
}

/**
 * Função principal de parsing
 * Recebe texto bruto e retorna questões parseadas
 */
export function parseQuestions(text: string): ParseResult {
  const errors: string[] = [];
  const questions: ParsedQuestion[] = [];
  
  const blocks = splitIntoQuestionBlocks(text);
  console.log(`[QuestionParser] Found ${blocks.length} question blocks`);
  
  let padrao1Count = 0;
  let padrao2Count = 0;
  let comGabarito = 0;
  let semGabarito = 0;
  
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    
    try {
      const question = parseQuestionBlock(block);
      
      if (question) {
        questions.push(question);
        
        if (question.format === 'padrao1') padrao1Count++;
        if (question.format === 'padrao2') padrao2Count++;
        if (question.resposta_correta !== '?') comGabarito++;
        else semGabarito++;
        
        console.log(`[QuestionParser] Parsed Q${question.numero || i + 1}: tema="${question.tema}", format=${question.format}`);
      } else {
        if (block.length > 100) {
          errors.push(`Bloco ${i + 1}: Não foi possível extrair questão válida`);
        }
      }
    } catch (err) {
      errors.push(`Bloco ${i + 1}: Erro de parsing - ${err instanceof Error ? err.message : 'desconhecido'}`);
    }
  }
  
  return {
    success: questions.length > 0,
    questions,
    errors,
    stats: {
      total: questions.length,
      padrao1: padrao1Count,
      padrao2: padrao2Count,
      comGabarito,
      semGabarito
    }
  };
}

/**
 * Tenta detectar automaticamente se o texto contém questões no formato estruturado
 */
export function hasStructuredQuestionFormat(text: string): boolean {
  const indicators = [
    /QUEST[ÃA]O\s*\d+/i,
    /TEMA:\s*[^\n]+/i,
    /Enunciado:\s*/i,
    /Alternativas?:/i,
    /GABARITO:\s*[A-E]/i,
    /\n---+\n/
  ];
  
  let matches = 0;
  for (const indicator of indicators) {
    if (indicator.test(text)) matches++;
  }
  
  return matches >= 3;
}

/**
 * Valida uma questão parseada
 */
export function validateParsedQuestion(q: ParsedQuestion): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!q.enunciado || q.enunciado.length < 20) {
    issues.push('Enunciado muito curto');
  }
  
  const alts = [q.alternativa_a, q.alternativa_b, q.alternativa_c, q.alternativa_d, q.alternativa_e];
  const validAlts = alts.filter(a => a && a.length > 0).length;
  
  if (validAlts < 3) {
    issues.push(`Apenas ${validAlts} alternativas encontradas`);
  }
  
  if (q.resposta_correta === '?') {
    issues.push('Gabarito não identificado');
  } else if (!['A', 'B', 'C', 'D', 'E'].includes(q.resposta_correta)) {
    issues.push('Gabarito inválido');
  }
  
  if (!q.tema || q.tema === 'Geral') {
    issues.push('Tema não identificado');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}
