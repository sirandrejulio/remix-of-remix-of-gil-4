import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Engine types
type EngineName = 'lovable' | 'gemini';

interface EngineConfig {
  name: EngineName;
  url: string;
  model: string;
  apiKeyEnv: string;
  maxTokens: number;
  temperature?: number;
}

// Engine configurations
const ENGINES: Record<EngineName, EngineConfig> = {
  lovable: {
    name: 'lovable',
    url: 'https://ai.gateway.lovable.dev/v1/chat/completions',
    model: 'google/gemini-2.5-flash',
    apiKeyEnv: 'LOVABLE_API_KEY',
    maxTokens: 8192,
  },
  gemini: {
    name: 'gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    model: 'gemini-2.0-flash',
    apiKeyEnv: 'GOOGLE_GEMINI_API_KEY',
    maxTokens: 8192,
    temperature: 0.7,
  }
};

// Input validation schema
const inputSchema = z.object({
  action: z.enum([
    'generate_questions',
    'chat',
    'generate_document',
    'analyze_file',
    'generate_simulation',
    'extract_questions',
    'extract_questions_detailed'
  ]),
  prompt: z.string().max(50000).optional(),
  systemPrompt: z.string().max(50000).optional(),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string()
  })).optional(),
  context: z.record(z.unknown()).optional(),
  preferredEngine: z.enum(['lovable', 'gemini']).optional(),
  skipCache: z.boolean().optional().default(false),
  userId: z.string().optional(),
});

// Generate hash for caching
function generatePromptHash(action: string, prompt: string, context?: Record<string, unknown>): string {
  const content = `${action}:${prompt}:${JSON.stringify(context || {})}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `${action}_${Math.abs(hash).toString(36)}`;
}

// Check cache for existing response
async function checkCache(
  supabase: any,
  promptHash: string
): Promise<{ hit: boolean; data?: Record<string, unknown> }> {
  try {
    const { data, error } = await supabase
      .from('ai_response_cache')
      .select('response_data, id, hit_count')
      .eq('prompt_hash', promptHash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !data) {
      return { hit: false };
    }

    // Increment hit count
    await supabase
      .from('ai_response_cache')
      .update({ hit_count: (data.hit_count || 0) + 1 })
      .eq('id', data.id);

    return { hit: true, data: data.response_data as Record<string, unknown> };
  } catch (e) {
    console.error('Cache check error:', e);
    return { hit: false };
  }
}

// Save to cache
async function saveToCache(
  supabase: any,
  promptHash: string,
  promptPreview: string,
  action: string,
  engine: EngineName,
  responseData: Record<string, unknown>,
  tokensUsed?: number
): Promise<void> {
  try {
    await supabase
      .from('ai_response_cache')
      .upsert({
        prompt_hash: promptHash,
        prompt_preview: promptPreview.substring(0, 500),
        action,
        engine_used: engine,
        response_data: responseData,
        tokens_used: tokensUsed || 0,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        hit_count: 0
      }, {
        onConflict: 'prompt_hash'
      });
  } catch (e) {
    console.error('Cache save error:', e);
  }
}

// Log AI request
async function logRequest(
  supabase: any,
  userId: string | undefined,
  engine: EngineName,
  action: string,
  promptHash: string,
  cacheHit: boolean,
  fallbackUsed: boolean,
  fallbackReason: string | undefined,
  responseTimeMs: number,
  tokensUsed: number | undefined,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    await supabase.from('ai_engine_logs').insert({
      user_id: userId || null,
      engine_used: engine,
      action,
      prompt_hash: promptHash,
      cache_hit: cacheHit,
      fallback_used: fallbackUsed,
      fallback_reason: fallbackReason,
      response_time_ms: responseTimeMs,
      tokens_used: tokensUsed,
      success,
      error_message: errorMessage
    });

    // Update engine metrics via direct update (avoiding RPC type issues)
    const { data: existingMetrics } = await supabase
      .from('ai_engine_metrics')
      .select('*')
      .eq('engine_name', engine)
      .maybeSingle();

    if (existingMetrics) {
      const newRequestCount = (existingMetrics.request_count || 0) + 1;
      const newSuccessCount = (existingMetrics.success_count || 0) + (success ? 1 : 0);
      const newFailureCount = (existingMetrics.failure_count || 0) + (success ? 0 : 1);
      const newTotalTokens = (existingMetrics.total_tokens || 0) + (tokensUsed || 0);
      const newAvgResponseTime = responseTimeMs 
        ? Math.round(((existingMetrics.avg_response_time_ms || 0) * (existingMetrics.request_count || 0) + responseTimeMs) / newRequestCount)
        : existingMetrics.avg_response_time_ms;

      await supabase
        .from('ai_engine_metrics')
        .update({
          request_count: newRequestCount,
          success_count: newSuccessCount,
          failure_count: newFailureCount,
          total_tokens: newTotalTokens,
          avg_response_time_ms: newAvgResponseTime,
          last_used_at: new Date().toISOString(),
          last_error: success ? existingMetrics.last_error : errorMessage,
          is_healthy: success ? true : (newFailureCount >= 5 ? false : existingMetrics.is_healthy),
          updated_at: new Date().toISOString()
        })
        .eq('engine_name', engine);
    } else {
      await supabase.from('ai_engine_metrics').insert({
        engine_name: engine,
        request_count: 1,
        success_count: success ? 1 : 0,
        failure_count: success ? 0 : 1,
        total_tokens: tokensUsed || 0,
        avg_response_time_ms: responseTimeMs || 0,
        last_used_at: new Date().toISOString(),
        last_error: errorMessage,
        is_healthy: success
      });
    }
  } catch (e) {
    console.error('Log request error:', e);
  }
}

// Get engine health and determine which to use
async function selectEngine(
  supabase: any,
  preferred?: EngineName
): Promise<{ primary: EngineName; fallback: EngineName }> {
  try {
    const { data: metrics } = await supabase
      .from('ai_engine_metrics')
      .select('engine_name, is_healthy, request_count, last_used_at')
      .in('engine_name', ['lovable', 'gemini']);

    if (!metrics || metrics.length === 0) {
      return { primary: preferred || 'lovable', fallback: preferred === 'gemini' ? 'lovable' : 'gemini' };
    }

    const lovableMetrics = metrics.find((m: any) => m.engine_name === 'lovable');
    const geminiMetrics = metrics.find((m: any) => m.engine_name === 'gemini');

    // If user has preference and engine is healthy, use it
    if (preferred) {
      const preferredMetrics = preferred === 'lovable' ? lovableMetrics : geminiMetrics;
      if (preferredMetrics?.is_healthy) {
        return {
          primary: preferred,
          fallback: preferred === 'lovable' ? 'gemini' : 'lovable'
        };
      }
    }

    // Smart rotation: prefer the one used less recently if both healthy
    const lovableHealthy = lovableMetrics?.is_healthy !== false;
    const geminiHealthy = geminiMetrics?.is_healthy !== false;

    if (lovableHealthy && geminiHealthy) {
      // Rotate based on last used
      const lovableLastUsed = lovableMetrics?.last_used_at ? new Date(lovableMetrics.last_used_at).getTime() : 0;
      const geminiLastUsed = geminiMetrics?.last_used_at ? new Date(geminiMetrics.last_used_at).getTime() : 0;

      // Use the one that was used less recently
      if (lovableLastUsed <= geminiLastUsed) {
        return { primary: 'lovable', fallback: 'gemini' };
      } else {
        return { primary: 'gemini', fallback: 'lovable' };
      }
    }

    // One is unhealthy, use the healthy one
    if (lovableHealthy && !geminiHealthy) {
      return { primary: 'lovable', fallback: 'gemini' };
    }
    if (geminiHealthy && !lovableHealthy) {
      return { primary: 'gemini', fallback: 'lovable' };
    }

    // Both unhealthy, try lovable first
    return { primary: 'lovable', fallback: 'gemini' };
  } catch (e) {
    console.error('Engine selection error:', e);
    return { primary: preferred || 'lovable', fallback: preferred === 'gemini' ? 'lovable' : 'gemini' };
  }
}

// Call Lovable AI Gateway
async function callLovableAI(
  apiKey: string,
  messages: Array<{ role: string; content: string }>
): Promise<{ success: boolean; content?: string; error?: string; tokensUsed?: number }> {
  try {
    const response = await fetch(ENGINES.lovable.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ENGINES.lovable.model,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return { success: false, error: 'Rate limit exceeded' };
      }
      if (response.status === 402) {
        return { success: false, error: 'Payment required' };
      }
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const tokensUsed = data.usage?.total_tokens;

    if (!content) {
      return { success: false, error: 'Empty response' };
    }

    return { success: true, content, tokensUsed };
  } catch (e) {
    console.error('Lovable AI call error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// Call Google Gemini directly
async function callGeminiAI(
  apiKey: string,
  messages: Array<{ role: string; content: string }>
): Promise<{ success: boolean; content?: string; error?: string; tokensUsed?: number }> {
  try {
    // Convert messages to Gemini format
    const parts = messages.map(m => ({ text: m.content }));

    const response = await fetch(
      `${ENGINES.gemini.url}?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: ENGINES.gemini.temperature,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: ENGINES.gemini.maxTokens,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const tokensUsed = data.usageMetadata?.totalTokenCount;

    if (!content) {
      return { success: false, error: 'Empty response' };
    }

    return { success: true, content, tokensUsed };
  } catch (e) {
    console.error('Gemini API call error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// Main AI call with fallback
async function callAIWithFallback(
  supabase: any,
  messages: Array<{ role: string; content: string }>,
  primaryEngine: EngineName,
  fallbackEngine: EngineName
): Promise<{ success: boolean; content?: string; engine: EngineName; fallbackUsed: boolean; error?: string; tokensUsed?: number }> {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const geminiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');

  // Try primary engine
  console.log(`Trying primary engine: ${primaryEngine}`);
  
  let primaryResult: { success: boolean; content?: string; error?: string; tokensUsed?: number };
  
  if (primaryEngine === 'lovable' && lovableKey) {
    primaryResult = await callLovableAI(lovableKey, messages);
  } else if (primaryEngine === 'gemini' && geminiKey) {
    primaryResult = await callGeminiAI(geminiKey, messages);
  } else {
    primaryResult = { success: false, error: `${primaryEngine} API key not configured` };
  }

  if (primaryResult.success) {
    return {
      success: true,
      content: primaryResult.content,
      engine: primaryEngine,
      fallbackUsed: false,
      tokensUsed: primaryResult.tokensUsed
    };
  }

  // Primary failed, try fallback
  console.log(`Primary engine ${primaryEngine} failed: ${primaryResult.error}. Trying fallback: ${fallbackEngine}`);
  
  let fallbackResult: { success: boolean; content?: string; error?: string; tokensUsed?: number };
  
  if (fallbackEngine === 'lovable' && lovableKey) {
    fallbackResult = await callLovableAI(lovableKey, messages);
  } else if (fallbackEngine === 'gemini' && geminiKey) {
    fallbackResult = await callGeminiAI(geminiKey, messages);
  } else {
    fallbackResult = { success: false, error: `${fallbackEngine} API key not configured` };
  }

  if (fallbackResult.success) {
    return {
      success: true,
      content: fallbackResult.content,
      engine: fallbackEngine,
      fallbackUsed: true,
      tokensUsed: fallbackResult.tokensUsed
    };
  }

  // Both failed
  return {
    success: false,
    error: `Both engines failed. Primary (${primaryEngine}): ${primaryResult.error}. Fallback (${fallbackEngine}): ${fallbackResult.error}`,
    engine: primaryEngine,
    fallbackUsed: true
  };
}

serve(async (req) => {
  console.log('Unified AI Engine - Request received:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase configuration missing');
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const rawBody = await req.json();
    
    // Validate input
    const parseResult = inputSchema.safeParse(rawBody);
    if (!parseResult.success) {
      console.error('Validation error:', parseResult.error.issues);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid input data', 
          details: parseResult.error.issues.map(i => i.message) 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { action, prompt, systemPrompt, messages: inputMessages, context, preferredEngine, skipCache, userId } = parseResult.data;

    console.log('Processing request:', { action, preferredEngine, skipCache, hasPrompt: !!prompt });

    // Build messages array
    let messages: Array<{ role: string; content: string }> = [];
    
    if (inputMessages && inputMessages.length > 0) {
      messages = inputMessages.map(m => ({ role: m.role, content: m.content }));
    } else {
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      if (prompt) {
        messages.push({ role: 'user', content: prompt });
      }
    }

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No prompt or messages provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate cache key
    const fullPrompt = messages.map(m => m.content).join('\n');
    const promptHash = generatePromptHash(action, fullPrompt, context);

    // Check cache (unless skipped)
    if (!skipCache) {
      const cacheResult = await checkCache(supabase, promptHash);
      if (cacheResult.hit && cacheResult.data) {
        console.log('Cache hit for:', promptHash);
        
        const responseTime = Date.now() - startTime;
        await logRequest(supabase, userId, 'lovable', action, promptHash, true, false, undefined, responseTime, 0, true);

        return new Response(
          JSON.stringify({
            success: true,
            ...cacheResult.data,
            cached: true,
            responseTimeMs: responseTime
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Select engine with rotation
    const { primary, fallback } = await selectEngine(supabase, preferredEngine);
    console.log(`Selected engines - Primary: ${primary}, Fallback: ${fallback}`);

    // Call AI with fallback
    const aiResult = await callAIWithFallback(supabase, messages, primary, fallback);
    const responseTime = Date.now() - startTime;

    if (!aiResult.success) {
      await logRequest(
        supabase, userId, aiResult.engine, action, promptHash,
        false, aiResult.fallbackUsed, aiResult.error, responseTime, 0, false, aiResult.error
      );

      return new Response(
        JSON.stringify({ success: false, error: aiResult.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON if applicable
    let parsedData: Record<string, unknown> | undefined;
    if (action === 'generate_questions' || action === 'generate_simulation' || action === 'extract_questions') {
      try {
        const jsonMatch = aiResult.content!.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('JSON parse error:', e);
      }
    }

    // Prepare response data
    const responseData: Record<string, unknown> = {
      content: aiResult.content,
      engine: aiResult.engine,
      fallbackUsed: aiResult.fallbackUsed,
      ...(parsedData && { data: parsedData })
    };

    // Save to cache
    await saveToCache(supabase, promptHash, fullPrompt, action, aiResult.engine, responseData, aiResult.tokensUsed);

    // Log request
    await logRequest(
      supabase, userId, aiResult.engine, action, promptHash,
      false, aiResult.fallbackUsed, aiResult.fallbackUsed ? 'Primary engine failed' : undefined,
      responseTime, aiResult.tokensUsed, true
    );

    return new Response(
      JSON.stringify({
        success: true,
        ...responseData,
        cached: false,
        responseTimeMs: responseTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unified AI Engine error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
