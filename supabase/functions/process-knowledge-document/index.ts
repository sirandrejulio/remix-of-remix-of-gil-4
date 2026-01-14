import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pako from "https://esm.sh/pako@2.1.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract text from PDF using pattern matching with decompression support
function extractTextFromPDF(bytes: Uint8Array): string {
  console.log('Extracting text from PDF...');
  
  try {
    const pdfContent = new TextDecoder('latin1').decode(bytes);
    const textParts: string[] = [];
    
    // Method 1: Extract and decompress FlateDecode streams
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    
    while ((match = streamRegex.exec(pdfContent)) !== null) {
      const streamData = match[1];
      
      try {
        const objStart = pdfContent.lastIndexOf('obj', match.index);
        const objHeader = pdfContent.substring(objStart, match.index);
        
        if (objHeader.includes('FlateDecode') || objHeader.includes('/Filter')) {
          const streamBytes = new Uint8Array(streamData.length);
          for (let i = 0; i < streamData.length; i++) {
            streamBytes[i] = streamData.charCodeAt(i);
          }
          
          try {
            const decompressed = pako.inflate(streamBytes);
            const decompressedText = new TextDecoder('latin1').decode(decompressed);
            const extractedFromStream = extractTextFromDecompressed(decompressedText);
            if (extractedFromStream.length > 10) {
              textParts.push(extractedFromStream);
            }
          } catch {
            try {
              const decompressed = pako.inflateRaw(streamBytes);
              const decompressedText = new TextDecoder('latin1').decode(decompressed);
              const extractedFromStream = extractTextFromDecompressed(decompressedText);
              if (extractedFromStream.length > 10) {
                textParts.push(extractedFromStream);
              }
            } catch {
              // Couldn't decompress
            }
          }
        }
      } catch {
        // Stream processing failed
      }
    }
    
    // Method 2: Extract from BT...ET text blocks
    const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
    while ((match = btEtRegex.exec(pdfContent)) !== null) {
      const block = match[1];
      const blockText = extractTextFromTextBlock(block);
      if (blockText.length > 5) {
        textParts.push(blockText);
      }
    }
    
    // Method 3: Look for direct text patterns
    const directTextRegex = /\(([^()]{5,500})\)\s*Tj/g;
    while ((match = directTextRegex.exec(pdfContent)) !== null) {
      const text = decodeEscapedText(match[1]);
      if (text.length > 5 && /[A-Za-zÀ-ÿ]{3,}/.test(text)) {
        textParts.push(text);
      }
    }
    
    let extractedText = textParts.join('\n').trim();
    extractedText = cleanExtractedText(extractedText);
    
    console.log(`Extracted ${extractedText.length} characters from PDF`);
    return extractedText;
  } catch (e) {
    console.error('PDF extraction error:', e);
    return '';
  }
}

function extractTextFromDecompressed(content: string): string {
  const textParts: string[] = [];
  const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
  let match;
  
  while ((match = btEtRegex.exec(content)) !== null) {
    const blockText = extractTextFromTextBlock(match[1]);
    if (blockText.length > 3) {
      textParts.push(blockText);
    }
  }
  
  const tjRegex = /\(([^()]+)\)\s*Tj/g;
  while ((match = tjRegex.exec(content)) !== null) {
    const text = decodeEscapedText(match[1]);
    if (text.length > 2 && /[A-Za-zÀ-ÿ0-9]/.test(text)) {
      textParts.push(text);
    }
  }
  
  const tjArrayRegex = /\[((?:[^\[\]]*|\([^)]*\))*)\]\s*TJ/g;
  while ((match = tjArrayRegex.exec(content)) !== null) {
    const arrayContent = match[1];
    const innerTexts = arrayContent.match(/\(([^)]*)\)/g) || [];
    const texts = innerTexts.map(t => decodeEscapedText(t.slice(1, -1))).filter(t => t.length > 0);
    if (texts.length > 0) {
      textParts.push(texts.join(''));
    }
  }
  
  return textParts.join(' ');
}

function extractTextFromTextBlock(block: string): string {
  const texts: string[] = [];
  
  const tjMatches = block.match(/\(([^)]*)\)\s*Tj/g) || [];
  for (const tj of tjMatches) {
    const text = tj.match(/\(([^)]*)\)/)?.[1] || '';
    if (text.trim()) texts.push(decodeEscapedText(text));
  }
  
  const tjArrayMatches = block.match(/\[((?:[^\[\]]*|\([^)]*\))*)\]\s*TJ/g) || [];
  for (const tj of tjArrayMatches) {
    const innerTexts = tj.match(/\(([^)]*)\)/g) || [];
    for (const innerText of innerTexts) {
      const text = innerText.slice(1, -1);
      if (text.trim()) texts.push(decodeEscapedText(text));
    }
  }
  
  const quoteMatches = block.match(/\(([^)]*)\)\s*['"]/g) || [];
  for (const qm of quoteMatches) {
    const text = qm.match(/\(([^)]*)\)/)?.[1] || '';
    if (text.trim()) texts.push(decodeEscapedText(text));
  }
  
  return texts.join('');
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/\x00/g, '')
    .replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

function decodeEscapedText(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\(\d{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));
}

function extractFilesFromZip(bytes: Uint8Array): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  let offset = 0;
  
  while (offset < bytes.length - 4) {
    if (bytes[offset] === 0x50 && bytes[offset + 1] === 0x4B && 
        bytes[offset + 2] === 0x03 && bytes[offset + 3] === 0x04) {
      
      const compressionMethod = bytes[offset + 8] | (bytes[offset + 9] << 8);
      const compressedSize = bytes[offset + 18] | (bytes[offset + 19] << 8) | 
                            (bytes[offset + 20] << 16) | (bytes[offset + 21] << 24);
      const fileNameLength = bytes[offset + 26] | (bytes[offset + 27] << 8);
      const extraFieldLength = bytes[offset + 28] | (bytes[offset + 29] << 8);
      
      const fileNameBytes = bytes.slice(offset + 30, offset + 30 + fileNameLength);
      const fileName = new TextDecoder('utf-8').decode(fileNameBytes);
      
      const dataStart = offset + 30 + fileNameLength + extraFieldLength;
      const compressedData = bytes.slice(dataStart, dataStart + compressedSize);
      
      if (compressedSize > 0) {
        let fileData: Uint8Array;
        
        if (compressionMethod === 0) {
          fileData = compressedData;
        } else if (compressionMethod === 8) {
          try {
            fileData = pako.inflateRaw(compressedData);
          } catch {
            try {
              fileData = pako.inflate(compressedData);
            } catch {
              offset++;
              continue;
            }
          }
        } else {
          offset++;
          continue;
        }
        
        files.set(fileName, fileData);
      }
      
      offset = dataStart + compressedSize;
    } else {
      offset++;
    }
  }
  
  return files;
}

function extractTextFromDocx(bytes: Uint8Array): string {
  console.log('Extracting text from DOCX...');
  
  try {
    const zipFiles = extractFilesFromZip(bytes);
    console.log(`Found ${zipFiles.size} files in DOCX archive`);
    
    let documentXml = '';
    for (const [fileName, fileData] of zipFiles) {
      if (fileName === 'word/document.xml' || fileName.includes('document.xml')) {
        documentXml = new TextDecoder('utf-8').decode(fileData);
        console.log(`Found document.xml: ${documentXml.length} chars`);
        break;
      }
    }
    
    if (!documentXml) {
      for (const [fileName, fileData] of zipFiles) {
        if (fileName.endsWith('.xml')) {
          const xmlContent = new TextDecoder('utf-8').decode(fileData);
          if (xmlContent.includes('<w:t')) {
            documentXml = xmlContent;
            console.log(`Using fallback XML: ${fileName}`);
            break;
          }
        }
      }
    }
    
    if (!documentXml) {
      console.log('No document.xml found in DOCX');
      return '';
    }
    
    let extractedText = '';
    const paragraphs = documentXml.split(/<w:p\b/);
    
    for (const para of paragraphs) {
      const paraTexts: string[] = [];
      const paraRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      let paraMatch;
      
      while ((paraMatch = paraRegex.exec(para)) !== null) {
        if (paraMatch[1]) {
          paraTexts.push(paraMatch[1]);
        }
      }
      
      if (paraTexts.length > 0) {
        extractedText += paraTexts.join('') + '\n';
      }
    }
    
    console.log(`Extracted ${extractedText.length} characters from DOCX`);
    return extractedText.trim();
  } catch (e) {
    console.error('DOCX extraction error:', e);
    return '';
  }
}

function extractTextFromDoc(bytes: Uint8Array): string {
  console.log('Extracting text from DOC (legacy format)...');
  
  try {
    const textParts: string[] = [];
    let currentText = '';
    
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      
      if ((byte >= 0x20 && byte <= 0x7E) || byte === 0x0A || byte === 0x0D || byte === 0x09) {
        currentText += String.fromCharCode(byte);
      } else if (byte >= 0xC0 && byte <= 0xFF && i + 1 < bytes.length) {
        const nextByte = bytes[i + 1];
        if (nextByte >= 0x80 && nextByte <= 0xBF) {
          const char = String.fromCharCode(((byte & 0x1F) << 6) | (nextByte & 0x3F));
          currentText += char;
          i++;
        }
      } else {
        if (currentText.length >= 4 && /[a-zA-ZÀ-ÿ]{2,}/.test(currentText)) {
          textParts.push(currentText);
        }
        currentText = '';
      }
    }
    
    if (currentText.length >= 4 && /[a-zA-ZÀ-ÿ]{2,}/.test(currentText)) {
      textParts.push(currentText);
    }
    
    let extractedText = textParts.join(' ')
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*/g, '$1\n')
      .trim();
    
    const lines = extractedText.split('\n');
    const cleanLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 3 && 
             /[A-Za-zÀ-ÿ]{2,}/.test(trimmed) && 
             !/^[0-9\s\-_=+*#@]+$/.test(trimmed);
    });
    
    extractedText = cleanLines.join('\n');
    
    console.log(`Extracted ${extractedText.length} characters from DOC`);
    return extractedText;
  } catch (e) {
    console.error('DOC extraction error:', e);
    return '';
  }
}

function extractTextFromTxt(bytes: Uint8Array): string {
  console.log('Extracting text from TXT...');
  try {
    const text = new TextDecoder('utf-8').decode(bytes);
    console.log(`Extracted ${text.length} characters from TXT`);
    return text;
  } catch (e) {
    console.error('TXT extraction error:', e);
    return '';
  }
}

function extractTextFromMd(bytes: Uint8Array): string {
  console.log('Extracting text from Markdown...');
  try {
    const text = new TextDecoder('utf-8').decode(bytes);
    // Remove markdown formatting but keep content
    const cleanText = text
      .replace(/#{1,6}\s*/g, '') // Headers
      .replace(/\*\*|__/g, '') // Bold
      .replace(/\*|_/g, '') // Italic
      .replace(/`{1,3}[^`]*`{1,3}/g, '') // Code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Images
      .replace(/^\s*[-*+]\s+/gm, '') // List items
      .replace(/^\s*\d+\.\s+/gm, '') // Numbered lists
      .replace(/^\s*>\s+/gm, '') // Blockquotes
      .trim();
    console.log(`Extracted ${cleanText.length} characters from Markdown`);
    return cleanText;
  } catch (e) {
    console.error('Markdown extraction error:', e);
    return '';
  }
}

// Analyze document with AI to create a summary and key concepts
async function analyzeDocumentWithAI(text: string, fileName: string): Promise<{
  summary: string;
  keyConcepts: string[];
  topics: string[];
}> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  
  try {
    console.log('Analyzing document with AI...');
    
    // Truncate text if too long (keep first 15000 chars for analysis)
    const truncatedText = text.length > 15000 ? text.substring(0, 15000) + '...' : text;
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/unified-ai-engine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        action: 'analyze_document',
        prompt: `Analise o seguinte documento "${fileName}" e forneça:
1. Um resumo conciso (máximo 500 palavras) destacando os pontos principais
2. Uma lista de 5-10 conceitos-chave abordados
3. Uma lista de 3-5 tópicos/temas principais

Documento:
${truncatedText}

Responda em formato JSON:
{
  "summary": "resumo aqui",
  "keyConcepts": ["conceito1", "conceito2", ...],
  "topics": ["tópico1", "tópico2", ...]
}`
      })
    });
    
    if (!response.ok) {
      throw new Error(`AI analysis failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.content) {
      try {
        // Try to parse JSON from the response
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            summary: parsed.summary || 'Resumo não disponível',
            keyConcepts: parsed.keyConcepts || [],
            topics: parsed.topics || []
          };
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
      }
    }
    
    // Fallback
    return {
      summary: 'Documento processado. Conteúdo disponível para consulta pelo agente.',
      keyConcepts: [],
      topics: []
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    return {
      summary: 'Documento processado. Análise automática não disponível.',
      keyConcepts: [],
      topics: []
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Configuração do Supabase ausente');
    }

    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sessão inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (!roleData || roleData.role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Acesso negado - apenas administradores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { documentId } = await req.json();

    if (!documentId) {
      return new Response(
        JSON.stringify({ success: false, error: 'ID do documento não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing knowledge document: ${documentId}`);

    // Get document info
    const { data: doc, error: docError } = await supabase
      .from('agent_knowledge_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !doc) {
      return new Response(
        JSON.stringify({ success: false, error: 'Documento não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to processing
    await supabase
      .from('agent_knowledge_documents')
      .update({ status: 'processando' })
      .eq('id', documentId);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('agent-knowledge')
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      await supabase
        .from('agent_knowledge_documents')
        .update({ status: 'erro' })
        .eq('id', documentId);
      
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao baixar arquivo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert to bytes
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    console.log(`File downloaded: ${doc.nome_arquivo} (${bytes.length} bytes)`);

    // Extract text based on file type
    let extractedText = '';
    const fileType = doc.tipo_arquivo.toLowerCase();
    const fileName = doc.nome_arquivo.toLowerCase();

    if (fileType === 'pdf' || fileName.endsWith('.pdf')) {
      extractedText = extractTextFromPDF(bytes);
    } else if (fileType === 'docx' || fileName.endsWith('.docx')) {
      extractedText = extractTextFromDocx(bytes);
    } else if (fileType === 'doc' || fileName.endsWith('.doc')) {
      extractedText = extractTextFromDoc(bytes);
    } else if (fileType === 'txt' || fileName.endsWith('.txt')) {
      extractedText = extractTextFromTxt(bytes);
    } else if (fileType === 'md' || fileName.endsWith('.md')) {
      extractedText = extractTextFromMd(bytes);
    } else {
      // Try as text
      extractedText = extractTextFromTxt(bytes);
    }

    console.log(`Extracted ${extractedText.length} characters`);

    if (extractedText.length < 50) {
      await supabase
        .from('agent_knowledge_documents')
        .update({ 
          status: 'erro',
          conteudo_extraido: 'Não foi possível extrair texto suficiente deste documento.'
        })
        .eq('id', documentId);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Não foi possível extrair texto suficiente do documento' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze document with AI
    const analysis = await analyzeDocumentWithAI(extractedText, doc.nome_arquivo);

    // Prepare final content for knowledge base
    const knowledgeContent = `
=== DOCUMENTO: ${doc.titulo} ===
Arquivo: ${doc.nome_arquivo}
Tipo: ${doc.tipo_arquivo}

=== RESUMO ===
${analysis.summary}

=== CONCEITOS-CHAVE ===
${analysis.keyConcepts.length > 0 ? analysis.keyConcepts.map(c => `• ${c}`).join('\n') : 'N/A'}

=== TÓPICOS PRINCIPAIS ===
${analysis.topics.length > 0 ? analysis.topics.map(t => `• ${t}`).join('\n') : 'N/A'}

=== CONTEÚDO COMPLETO ===
${extractedText}
`.trim();

    // Update document with extracted content
    await supabase
      .from('agent_knowledge_documents')
      .update({ 
        status: 'concluido',
        conteudo_extraido: knowledgeContent,
        ativo: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    // Log the action
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome')
      .eq('id', user.id)
      .single();

    await supabase.from('agent_admin_logs').insert({
      tipo: 'process_document',
      descricao: `Documento "${doc.titulo}" processado e adicionado à base de conhecimento`,
      admin_id: user.id,
      admin_nome: profile?.nome || 'Admin',
      detalhes: {
        document_id: documentId,
        file_name: doc.nome_arquivo,
        text_length: extractedText.length,
        concepts: analysis.keyConcepts,
        topics: analysis.topics
      }
    });

    // Update data source count
    const { count } = await supabase
      .from('agent_knowledge_documents')
      .select('id', { count: 'exact' })
      .eq('ativo', true)
      .eq('status', 'concluido');

    await supabase
      .from('agent_data_sources')
      .update({ 
        total_documentos: count || 0,
        ultima_atualizacao: new Date().toISOString()
      })
      .eq('tipo', 'documents');

    console.log(`Document ${documentId} processed successfully`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Documento processado e adicionado à base de conhecimento',
        data: {
          textLength: extractedText.length,
          summary: analysis.summary.substring(0, 200) + '...',
          conceptsCount: analysis.keyConcepts.length,
          topicsCount: analysis.topics.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Process knowledge document error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao processar documento';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
