import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get JWT from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[suspend-user] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Client with user context (for auth)
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get caller user
    const { data: { user: caller }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !caller) {
      console.error('[suspend-user] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[suspend-user] Caller: ${caller.id} (${caller.email})`);

    // Parse request body
    const { target_user_id, action } = await req.json();
    
    if (!target_user_id) {
      return new Response(
        JSON.stringify({ error: 'Bad Request', message: 'target_user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!action || !['suspend', 'reactivate'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Bad Request', message: 'action must be "suspend" or "reactivate"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[suspend-user] Action: ${action} on target: ${target_user_id}`);

    // Check caller's role using service client
    const { data: callerRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id);

    if (rolesError) {
      console.error('[suspend-user] Error fetching caller roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Internal Error', message: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roles = callerRoles?.map(r => r.role) || [];
    const isAdmin = roles.includes('admin') || roles.includes('superadmin');
    const isCoach = roles.includes('coach');

    console.log(`[suspend-user] Caller roles: ${roles.join(', ')} | isAdmin: ${isAdmin} | isCoach: ${isCoach}`);

    // Prevent self-suspension
    if (target_user_id === caller.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden', message: 'Cannot suspend yourself' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user info
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, email, name, coach_id')
      .eq('user_id', target_user_id)
      .single();

    if (targetError || !targetProfile) {
      console.error('[suspend-user] Target not found:', targetError);
      return new Response(
        JSON.stringify({ error: 'Not Found', message: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check target's roles
    const { data: targetRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', target_user_id);

    const targetRolesList = targetRoles?.map(r => r.role) || [];
    const targetIsCoachOrAdmin = targetRolesList.includes('admin') || 
                                  targetRolesList.includes('superadmin') || 
                                  targetRolesList.includes('coach');

    console.log(`[suspend-user] Target roles: ${targetRolesList.join(', ')} | isCoachOrAdmin: ${targetIsCoachOrAdmin}`);

    // AUTHORIZATION LOGIC
    if (isAdmin) {
      // Admin can suspend/reactivate anyone except superadmins
      if (targetRolesList.includes('superadmin')) {
        return new Response(
          JSON.stringify({ error: 'Forbidden', message: 'Cannot suspend a superadmin' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('[suspend-user] Admin authorization: OK');
    } else if (isCoach) {
      // Coach can only suspend athletes linked to them
      if (targetIsCoachOrAdmin) {
        return new Response(
          JSON.stringify({ error: 'Forbidden', message: 'Coaches cannot suspend other coaches or admins' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if athlete is linked to this coach
      const { data: link, error: linkError } = await supabaseAdmin
        .from('coach_athletes')
        .select('id')
        .eq('coach_id', caller.id)
        .eq('athlete_id', target_user_id)
        .maybeSingle();

      if (linkError || !link) {
        console.error('[suspend-user] Coach not linked to athlete:', linkError);
        return new Response(
          JSON.stringify({ error: 'Forbidden', message: 'You can only suspend athletes linked to you' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('[suspend-user] Coach authorization: OK (linked athlete)');
    } else {
      // Regular users cannot suspend anyone
      return new Response(
        JSON.stringify({ error: 'Forbidden', message: 'You do not have permission to suspend users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PERFORM ACTION
    const updateData = action === 'suspend' 
      ? {
          status: 'suspended',
          suspended_at: new Date().toISOString(),
          suspended_by: caller.id
        }
      : {
          status: 'active',
          suspended_at: null,
          suspended_by: null
        };

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('user_id', target_user_id);

    if (updateError) {
      console.error('[suspend-user] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Internal Error', message: 'Failed to update user status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[suspend-user] SUCCESS: User ${target_user_id} ${action}d by ${caller.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${action === 'suspend' ? 'suspended' : 'reactivated'} successfully`,
        target_user_id,
        action
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[suspend-user] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal Error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
