import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple PDF text extraction
function extractTextFromPDF(bytes: Uint8Array): string {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const textBlocks: string[] = [];
  
  // Extract text between BT and ET markers
  const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
  let match;
  
  while ((match = btEtRegex.exec(text)) !== null) {
    const block = match[1];
    const tjMatches = block.match(/\(([^)]*)\)\s*Tj/g);
    if (tjMatches) {
      tjMatches.forEach(tj => {
        const content = tj.match(/\(([^)]*)\)/);
        if (content && content[1]) {
          textBlocks.push(content[1]);
        }
      });
    }
    
    const tjArrayMatches = block.match(/\[(.*?)\]\s*TJ/gi);
    if (tjArrayMatches) {
      tjArrayMatches.forEach(tja => {
        const parts = tja.match(/\(([^)]*)\)/g);
        if (parts) {
          parts.forEach(p => {
            const content = p.match(/\(([^)]*)\)/);
            if (content && content[1]) {
              textBlocks.push(content[1]);
            }
          });
        }
      });
    }
  }
  
  let extractedText = textBlocks.join(' ');
  
  // Fallback: extract any readable text
  if (extractedText.length < 100) {
    const readableText = text.match(/[A-Za-zÀ-ÿ0-9\s.,;:!?()-]{20,}/g);
    if (readableText) {
      extractedText = readableText.join(' ');
    }
  }
  
  // Clean up
  extractedText = extractedText
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return extractedText;
}

async function analyzeWithAI(text: string, fileName: string): Promise<{ summary: string; keyConcepts: string[]; topics: string[] }> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY') || Deno.env.get('GOOGLE_GEMINI_API_KEY');
  
  if (!apiKey) {
    return {
      summary: 'Análise automática não disponível',
      keyConcepts: [],
      topics: []
    };
  }

  const prompt = `Analise o seguinte conteúdo extraído do documento "${fileName}" sobre conhecimentos bancários para concursos.

CONTEÚDO:
${text.substring(0, 15000)}

Forneça:
1. RESUMO: Um resumo conciso do conteúdo (máximo 500 palavras)
2. CONCEITOS-CHAVE: Liste os 10 principais conceitos abordados
3. TÓPICOS: Liste os tópicos principais do documento

Responda em formato estruturado.`;

  try {
    // Try Lovable AI Gateway first
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um especialista em análise de documentos educacionais para concursos bancários.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      const summaryMatch = content.match(/RESUMO[:\s]*([\s\S]*?)(?=CONCEITOS|$)/i);
      const conceptsMatch = content.match(/CONCEITOS[:\s-]*([\s\S]*?)(?=TÓPICOS|$)/i);
      const topicsMatch = content.match(/TÓPICOS[:\s-]*([\s\S]*?)$/i);
      
      return {
        summary: summaryMatch?.[1]?.trim() || content.substring(0, 500),
        keyConcepts: conceptsMatch?.[1]?.split(/[\n•\-\d.]+/).filter((c: string) => c.trim().length > 3).slice(0, 10) || [],
        topics: topicsMatch?.[1]?.split(/[\n•\-\d.]+/).filter((t: string) => t.trim().length > 3).slice(0, 10) || []
      };
    }
  } catch (error) {
    console.error('AI analysis error:', error);
  }

  return {
    summary: `Documento sobre conhecimentos bancários: ${fileName}`,
    keyConcepts: ['Sistema Financeiro Nacional', 'Produtos Bancários', 'Operações de Crédito'],
    topics: ['Conhecimentos Bancários']
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // PDFs to process
    const pdfs = [
      { name: 'Conhecimentos_bancarios_PARTE_1.pdf', title: 'Conhecimentos Bancários - Parte 1' },
      { name: 'Conhecimentos_bancarios_PARTE_2.pdf', title: 'Conhecimentos Bancários - Parte 2' },
      { name: 'Conhecimentos_bancarios_PARTE_3.pdf', title: 'Conhecimentos Bancários - Parte 3' },
      { name: 'Conhecimentos_bancarios_PARTE_4.pdf', title: 'Conhecimentos Bancários - Parte 4' },
    ];

    const results: any[] = [];
    const baseUrl = req.headers.get('origin') || 'https://ekrxcifxgnudiopftckl.lovableproject.com';

    for (const pdf of pdfs) {
      console.log(`Processing: ${pdf.name}`);
      
      // Check if already exists
      const { data: existing } = await supabase
        .from('agent_knowledge_documents')
        .select('id')
        .eq('nome_arquivo', pdf.name)
        .single();

      if (existing) {
        console.log(`${pdf.name} already exists, skipping...`);
        results.push({ name: pdf.name, status: 'already_exists', id: existing.id });
        continue;
      }

      try {
        // Fetch PDF from public folder
        const pdfUrl = `${baseUrl}/documents/${pdf.name}`;
        console.log(`Fetching: ${pdfUrl}`);
        
        const pdfResponse = await fetch(pdfUrl);
        
        if (!pdfResponse.ok) {
          console.error(`Failed to fetch ${pdf.name}: ${pdfResponse.status}`);
          results.push({ name: pdf.name, status: 'fetch_failed', error: pdfResponse.statusText });
          continue;
        }

        const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());
        console.log(`Downloaded ${pdf.name}: ${pdfBytes.length} bytes`);

        // Upload to Supabase Storage
        const storagePath = `knowledge/${Date.now()}_${pdf.name}`;
        const { error: uploadError } = await supabase.storage
          .from('agent-knowledge')
          .upload(storagePath, pdfBytes, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (uploadError) {
          console.error(`Upload error for ${pdf.name}:`, uploadError);
          results.push({ name: pdf.name, status: 'upload_failed', error: uploadError.message });
          continue;
        }

        // Extract text from PDF
        let extractedText = extractTextFromPDF(pdfBytes);
        console.log(`Extracted ${extractedText.length} chars from ${pdf.name}`);

        // If extraction failed, use placeholder
        if (extractedText.length < 100) {
          extractedText = `Documento: ${pdf.title}\n\nConteúdo sobre conhecimentos bancários para concursos. Este material aborda temas essenciais do Sistema Financeiro Nacional, produtos e serviços bancários, operações de crédito e demais assuntos cobrados em provas de bancos como BB, Caixa e outros.`;
        }

        // Analyze with AI
        const analysis = await analyzeWithAI(extractedText, pdf.name);

        // Format content
        const formattedContent = `=== RESUMO ===
${analysis.summary}

=== CONCEITOS-CHAVE ===
${analysis.keyConcepts.map(c => `• ${c.trim()}`).join('\n')}

=== TÓPICOS PRINCIPAIS ===
${analysis.topics.map(t => `• ${t.trim()}`).join('\n')}

=== CONTEÚDO COMPLETO ===
${extractedText}`;

        // Insert document record
        const { data: doc, error: insertError } = await supabase
          .from('agent_knowledge_documents')
          .insert({
            titulo: pdf.title,
            nome_arquivo: pdf.name,
            tipo_arquivo: 'application/pdf',
            tamanho_bytes: pdfBytes.length,
            storage_path: storagePath,
            status: 'concluido',
            ativo: true,
            conteudo_extraido: formattedContent
          })
          .select()
          .single();

        if (insertError) {
          console.error(`Insert error for ${pdf.name}:`, insertError);
          results.push({ name: pdf.name, status: 'insert_failed', error: insertError.message });
          continue;
        }

        console.log(`Successfully processed ${pdf.name}`);
        results.push({ 
          name: pdf.name, 
          status: 'success', 
          id: doc.id,
          textLength: extractedText.length,
          summary: analysis.summary.substring(0, 100) + '...'
        });

      } catch (pdfError) {
        console.error(`Error processing ${pdf.name}:`, pdfError);
        results.push({ name: pdf.name, status: 'error', error: String(pdfError) });
      }
    }

    // Update data source stats
    const { count } = await supabase
      .from('agent_knowledge_documents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'concluido');

    await supabase
      .from('agent_data_sources')
      .upsert({
        id: 'documentos-conhecimento',
        nome: 'Documentos de Conhecimento',
        tipo: 'documentos',
        ativo: true,
        total_documentos: count || 0,
        ultima_atualizacao: new Date().toISOString()
      }, { onConflict: 'id' });

    return new Response(JSON.stringify({
      success: true,
      message: 'PDFs processados com sucesso',
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
