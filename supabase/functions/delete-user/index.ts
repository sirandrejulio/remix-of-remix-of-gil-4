import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// UUID regex for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Input validation schema with limits
const deleteUserSchema = z.object({
  userId: z.string().regex(uuidRegex, "ID de usuário inválido").optional(),
  userIds: z.array(z.string().regex(uuidRegex, "ID de usuário inválido"))
    .max(50, "Máximo de 50 usuários por vez")
    .optional(),
}).refine(data => data.userId || (data.userIds && data.userIds.length > 0), {
  message: "userId ou userIds é obrigatório"
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!roleData || roleData.role !== "admin") {
      return new Response(JSON.stringify({ error: "Acesso negado: apenas administradores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate request body
    let rawBody;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Corpo da requisição inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parseResult = deleteUserSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map(i => i.message);
      return new Response(JSON.stringify({ error: errors[0], details: errors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId, userIds } = parseResult.data;

    // Handle bulk delete
    const idsToDelete = userIds || (userId ? [userId] : []);

    // Prevent self-deletion
    if (idsToDelete.includes(caller.id)) {
      return new Response(JSON.stringify({ error: "Você não pode excluir sua própria conta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deletedUsers: string[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const id of idsToDelete) {
      try {
        // Delete user using Admin API (this will cascade to profiles due to FK)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);

        if (deleteError) {
          errors.push({ id, error: "Falha ao excluir" });
        } else {
          deletedUsers.push(id);
        }
      } catch {
        errors.push({ id, error: "Erro inesperado" });
      }
    }

    // Log admin action (without sensitive details)
    await supabaseAdmin.from("admin_logs").insert({
      user_id: caller.id,
      action: "delete_users",
      resource_type: "users",
      resource_id: `${deletedUsers.length} users`,
      details: { 
        deleted_count: deletedUsers.length, 
        errors_count: errors.length 
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted: deletedUsers.length,
        errors: errors.length > 0 ? errors.length : undefined,
        message: `${deletedUsers.length} usuário(s) excluído(s)${errors.length > 0 ? `, ${errors.length} erro(s)` : ''}`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
