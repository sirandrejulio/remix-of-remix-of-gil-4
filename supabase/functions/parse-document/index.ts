import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pako from "https://esm.sh/pako@2.1.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract text from PDF using pattern matching with decompression support
function extractTextFromPDF(base64Data: string): string {
  console.log('Extracting text from PDF without AI...');
  
  try {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const pdfContent = new TextDecoder('latin1').decode(bytes);
    const textParts: string[] = [];
    
    // Method 1: Extract and decompress FlateDecode streams
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    
    while ((match = streamRegex.exec(pdfContent)) !== null) {
      const streamData = match[1];
      
      // Try to decompress if it's a FlateDecode stream
      try {
        // Find the preceding object definition to check for FlateDecode
        const objStart = pdfContent.lastIndexOf('obj', match.index);
        const objHeader = pdfContent.substring(objStart, match.index);
        
        if (objHeader.includes('FlateDecode') || objHeader.includes('/Filter')) {
          // Convert stream to bytes and try to decompress
          const streamBytes = new Uint8Array(streamData.length);
          for (let i = 0; i < streamData.length; i++) {
            streamBytes[i] = streamData.charCodeAt(i);
          }
          
          try {
            const decompressed = pako.inflate(streamBytes);
            const decompressedText = new TextDecoder('latin1').decode(decompressed);
            
            // Extract text from decompressed content
            const extractedFromStream = extractTextFromDecompressed(decompressedText);
            if (extractedFromStream.length > 10) {
              textParts.push(extractedFromStream);
            }
          } catch {
            // Not a valid zlib stream, try raw deflate
            try {
              const decompressed = pako.inflateRaw(streamBytes);
              const decompressedText = new TextDecoder('latin1').decode(decompressed);
              const extractedFromStream = extractTextFromDecompressed(decompressedText);
              if (extractedFromStream.length > 10) {
                textParts.push(extractedFromStream);
              }
            } catch {
              // Couldn't decompress, skip
            }
          }
        }
      } catch {
        // Stream processing failed, continue
      }
    }
    
    // Method 2: Extract from BT...ET text blocks (uncompressed PDFs)
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
    
    // Clean up
    extractedText = cleanExtractedText(extractedText);
    
    console.log(`Extracted ${extractedText.length} characters from PDF`);
    return extractedText;
  } catch (e) {
    console.error('PDF extraction error:', e);
    return '';
  }
}

// Extract text from decompressed PDF stream
function extractTextFromDecompressed(content: string): string {
  const textParts: string[] = [];
  
  // Extract from BT...ET blocks
  const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
  let match;
  
  while ((match = btEtRegex.exec(content)) !== null) {
    const blockText = extractTextFromTextBlock(match[1]);
    if (blockText.length > 3) {
      textParts.push(blockText);
    }
  }
  
  // Also try direct Tj extraction
  const tjRegex = /\(([^()]+)\)\s*Tj/g;
  while ((match = tjRegex.exec(content)) !== null) {
    const text = decodeEscapedText(match[1]);
    if (text.length > 2 && /[A-Za-zÀ-ÿ0-9]/.test(text)) {
      textParts.push(text);
    }
  }
  
  // Extract from TJ arrays
  const tjArrayRegex = /\[((?:[^[\]]*|\([^)]*\))*)\]\s*TJ/g;
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

// Extract text from a BT...ET text block
function extractTextFromTextBlock(block: string): string {
  const texts: string[] = [];
  
  // Tj operator
  const tjMatches = block.match(/\(([^)]*)\)\s*Tj/g) || [];
  for (const tj of tjMatches) {
    const text = tj.match(/\(([^)]*)\)/)?.[1] || '';
    if (text.trim()) texts.push(decodeEscapedText(text));
  }
  
  // TJ operator (array of text)
  const tjArrayMatches = block.match(/\[((?:[^[\]]*|\([^)]*\))*)\]\s*TJ/g) || [];
  for (const tj of tjArrayMatches) {
    const innerTexts = tj.match(/\(([^)]*)\)/g) || [];
    for (const innerText of innerTexts) {
      const text = innerText.slice(1, -1);
      if (text.trim()) texts.push(decodeEscapedText(text));
    }
  }
  
  // ' and " operators (also show text)
  const quoteMatches = block.match(/\(([^)]*)\)\s*['"]/g) || [];
  for (const qm of quoteMatches) {
    const text = qm.match(/\(([^)]*)\)/)?.[1] || '';
    if (text.trim()) texts.push(decodeEscapedText(text));
  }
  
  return texts.join('');
}

// Clean extracted text
function cleanExtractedText(text: string): string {
  return text
    .replace(/\x00/g, '')
    .replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

// Decode PDF escape sequences
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

// Simple ZIP extraction for DOCX files
function extractFilesFromZip(bytes: Uint8Array): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  let offset = 0;
  
  while (offset < bytes.length - 4) {
    // Look for local file header signature (PK\x03\x04)
    if (bytes[offset] === 0x50 && bytes[offset + 1] === 0x4B && 
        bytes[offset + 2] === 0x03 && bytes[offset + 3] === 0x04) {
      
      const compressionMethod = bytes[offset + 8] | (bytes[offset + 9] << 8);
      const compressedSize = bytes[offset + 18] | (bytes[offset + 19] << 8) | 
                            (bytes[offset + 20] << 16) | (bytes[offset + 21] << 24);
      const uncompressedSize = bytes[offset + 22] | (bytes[offset + 23] << 8) | 
                               (bytes[offset + 24] << 16) | (bytes[offset + 25] << 24);
      const fileNameLength = bytes[offset + 26] | (bytes[offset + 27] << 8);
      const extraFieldLength = bytes[offset + 28] | (bytes[offset + 29] << 8);
      
      const fileNameBytes = bytes.slice(offset + 30, offset + 30 + fileNameLength);
      const fileName = new TextDecoder('utf-8').decode(fileNameBytes);
      
      const dataStart = offset + 30 + fileNameLength + extraFieldLength;
      const compressedData = bytes.slice(dataStart, dataStart + compressedSize);
      
      if (compressedSize > 0) {
        let fileData: Uint8Array;
        
        if (compressionMethod === 0) {
          // No compression
          fileData = compressedData;
        } else if (compressionMethod === 8) {
          // Deflate compression
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

// Extract text from DOCX (no AI required)
function extractTextFromDocx(base64Data: string): string {
  console.log('Extracting text from DOCX without AI...');
  
  try {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // DOCX is a ZIP file - extract it
    const zipFiles = extractFilesFromZip(bytes);
    console.log(`Found ${zipFiles.size} files in DOCX archive`);
    
    // Look for word/document.xml - the main content file
    let documentXml = '';
    for (const [fileName, fileData] of zipFiles) {
      if (fileName === 'word/document.xml' || fileName.includes('document.xml')) {
        documentXml = new TextDecoder('utf-8').decode(fileData);
        console.log(`Found document.xml: ${documentXml.length} chars`);
        break;
      }
    }
    
    if (!documentXml) {
      // Fallback: try to find any XML with text content
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
    
    // Extract text from <w:t> tags
    const textParts: string[] = [];
    const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;
    
    while ((match = regex.exec(documentXml)) !== null) {
      if (match[1]) {
        textParts.push(match[1]);
      }
    }
    
    // Also check for paragraph breaks
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
    
    extractedText = extractedText.trim();
    
    // If paragraph-based extraction failed, use simple extraction
    if (extractedText.length < 50 && textParts.length > 0) {
      extractedText = textParts.join(' ');
    }
    
    console.log(`Extracted ${extractedText.length} characters from DOCX`);
    return extractedText;
  } catch (e) {
    console.error('DOCX extraction error:', e);
    return '';
  }
}

// Extract text from DOC (legacy Word format)
function extractTextFromDoc(base64Data: string): string {
  console.log('Extracting text from DOC (legacy format)...');
  
  try {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // DOC is a binary OLE2 format - extract readable text sequences
    const textParts: string[] = [];
    let currentText = '';
    
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      
      // Check for printable ASCII characters
      if ((byte >= 0x20 && byte <= 0x7E) || byte === 0x0A || byte === 0x0D || byte === 0x09) {
        currentText += String.fromCharCode(byte);
      } else if (byte >= 0xC0 && byte <= 0xFF && i + 1 < bytes.length) {
        // UTF-8 continuation bytes (accented characters)
        const nextByte = bytes[i + 1];
        if (nextByte >= 0x80 && nextByte <= 0xBF) {
          const char = String.fromCharCode(((byte & 0x1F) << 6) | (nextByte & 0x3F));
          currentText += char;
          i++;
        }
      } else {
        // Non-printable character - check if we have accumulated text
        if (currentText.length >= 4 && /[a-zA-ZÀ-ÿ]{2,}/.test(currentText)) {
          textParts.push(currentText);
        }
        currentText = '';
      }
    }
    
    // Add any remaining text
    if (currentText.length >= 4 && /[a-zA-ZÀ-ÿ]{2,}/.test(currentText)) {
      textParts.push(currentText);
    }
    
    // Join and clean the extracted text
    let extractedText = textParts.join(' ')
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*/g, '$1\n')
      .trim();
    
    // Filter out obvious garbage
    const lines = extractedText.split('\n');
    const cleanLines = lines.filter(line => {
      const trimmed = line.trim();
      // Keep lines with reasonable word patterns
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

// Extract text from TXT (simple base64 decode)
function extractTextFromTxt(base64Data: string): string {
  console.log('Extracting text from TXT...');
  try {
    const text = atob(base64Data);
    console.log(`Extracted ${text.length} characters from TXT`);
    return text;
  } catch (e) {
    console.error('TXT extraction error:', e);
    return '';
  }
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

    const { fileData, fileName, fileType } = await req.json();

    if (!fileData) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Parsing document: ${fileName} (${fileType}) - FREE extraction (no AI)`);

    let extractedText = '';

    if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      extractedText = extractTextFromPDF(fileData);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.toLowerCase().endsWith('.docx')
    ) {
      extractedText = extractTextFromDocx(fileData);
    } else if (
      fileType === 'application/msword' ||
      fileName.toLowerCase().endsWith('.doc')
    ) {
      extractedText = extractTextFromDoc(fileData);
    } else if (fileType === 'text/plain' || fileName.toLowerCase().endsWith('.txt')) {
      extractedText = extractTextFromTxt(fileData);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: `Unsupported file type: ${fileType}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!extractedText || extractedText.length < 50) {
      console.log(`Insufficient text extracted: ${extractedText.length} chars`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Não foi possível extrair texto suficiente do documento. O PDF pode estar escaneado (imagem) ou protegido. Tente um arquivo de texto (.txt) ou DOCX.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully extracted ${extractedText.length} characters (FREE)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        text: extractedText,
        charCount: extractedText.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Parse document error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
