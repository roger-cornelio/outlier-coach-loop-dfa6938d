import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get request body first to check email
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ========== JWT AUTHENTICATION ==========
    // This endpoint can be called by:
    // 1. The coach themselves (setting their own password)
    // 2. An admin/superadmin (resetting any coach's password)
    const authHeader = req.headers.get("Authorization");
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // If auth header is provided, validate it
    if (authHeader?.startsWith("Bearer ")) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user: callerUser }, error: userError } = await supabaseAuth.auth.getUser();
      
      if (!userError && callerUser) {
        // User is authenticated - check if they are:
        // 1. Setting their own password (email matches)
        // 2. An admin/superadmin
        const callerEmail = callerUser.email?.toLowerCase().trim();
        
        if (callerEmail !== normalizedEmail) {
          // Not their own email - check if admin
          const { data: callerRoles } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", callerUser.id);

          const hasAdminRole = callerRoles?.some(r => r.role === "admin" || r.role === "superadmin");
          if (!hasAdminRole) {
            console.error("[update-coach-password] Non-admin trying to update another user's password:", callerUser.id);
            return new Response(
              JSON.stringify({ error: "Forbidden - Cannot update another user's password" }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          console.log("[update-coach-password] Admin updating password for:", normalizedEmail);
        } else {
          console.log("[update-coach-password] User updating their own password:", normalizedEmail);
        }
      }
    }
    // Note: If no auth header, we still proceed but require the user exists and has coach role
    // This allows the initial password set flow when user doesn't have a session yet
    // ========== END AUTHENTICATION ==========

    console.log("[update-coach-password] Updating password for:", normalizedEmail);

    // Find user by email
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const user = usersData?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (!user) {
      console.error("[update-coach-password] User not found:", normalizedEmail);
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has coach role
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasCoachRole = roles?.some((r) => r.role === "coach");

    if (!hasCoachRole) {
      console.error("[update-coach-password] User is not a coach:", user.id);
      return new Response(
        JSON.stringify({ error: "Usuário não é coach aprovado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password }
    );

    if (updateError) {
      console.error("[update-coach-password] Update error:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[update-coach-password] Success for user:", user.id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[update-coach-password] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});