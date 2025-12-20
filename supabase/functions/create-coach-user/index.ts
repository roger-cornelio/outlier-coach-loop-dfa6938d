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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get request body
    const { email, full_name, application_id } = await req.json();

    if (!email || !application_id) {
      return new Response(
        JSON.stringify({ error: "email and application_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    console.log("[create-coach-user] Creating user for:", normalizedEmail);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    let userId: string;

    if (existingUser) {
      console.log("[create-coach-user] User already exists:", existingUser.id);
      userId = existingUser.id;
    } else {
      // Create user without password (invite-like)
      // Generate a random temporary password (user will set their own later)
      const tempPassword = crypto.randomUUID() + "Aa1!";

      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password: tempPassword,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            name: full_name || normalizedEmail.split("@")[0],
            requires_password_reset: true,
          },
        });

      if (createError) {
        console.error("[create-coach-user] Create user error:", createError);
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
      console.log("[create-coach-user] Created new user:", userId);
    }

    // Grant coach role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "coach" },
        { onConflict: "user_id, role" }
      );

    if (roleError) {
      console.error("[create-coach-user] Role upsert error:", roleError);
    }

    // Update application with auth_user_id
    const { error: appError } = await supabaseAdmin
      .from("coach_applications")
      .update({ auth_user_id: userId, status: "approved" })
      .eq("id", application_id);

    if (appError) {
      console.error("[create-coach-user] Application update error:", appError);
    }

    // Create profile if not exists
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          email: normalizedEmail,
          name: full_name || normalizedEmail.split("@")[0],
        },
        { onConflict: "user_id" }
      );

    if (profileError) {
      console.error("[create-coach-user] Profile upsert error:", profileError);
    }

    console.log("[create-coach-user] Success - user_id:", userId);

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[create-coach-user] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});