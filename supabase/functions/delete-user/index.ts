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
      console.error('[delete-user] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Client with user context
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get caller user
    const { data: { user: caller }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !caller) {
      console.error('[delete-user] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[delete-user] Caller: ${caller.id} (${caller.email})`);

    // Parse request body
    const { target_user_id, confirm_deletion } = await req.json();
    
    if (!target_user_id) {
      return new Response(
        JSON.stringify({ error: 'Bad Request', message: 'target_user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (confirm_deletion !== true) {
      return new Response(
        JSON.stringify({ error: 'Bad Request', message: 'confirm_deletion must be true' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[delete-user] Target: ${target_user_id}`);

    // ONLY SUPERADMINS CAN DELETE USERS (NOT regular admins)
    const { data: callerRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id);

    if (rolesError) {
      console.error('[delete-user] Error fetching caller roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Internal Error', message: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roles = callerRoles?.map(r => r.role) || [];
    const isSuperadmin = roles.includes('superadmin');

    console.log(`[delete-user] Caller roles: ${roles.join(', ')} | isSuperadmin: ${isSuperadmin}`);

    if (!isSuperadmin) {
      console.error('[delete-user] Caller is not superadmin. Roles:', roles);
      return new Response(
        JSON.stringify({ error: 'Forbidden', message: 'Only superadmins can delete users. Regular admins cannot perform this action.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-deletion
    if (target_user_id === caller.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden', message: 'Cannot delete yourself' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if target is superadmin (cannot delete superadmins)
    const { data: targetRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', target_user_id);

    const targetRolesList = targetRoles?.map(r => r.role) || [];
    if (targetRolesList.includes('superadmin')) {
      return new Response(
        JSON.stringify({ error: 'Forbidden', message: 'Cannot delete a superadmin' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target profile for logging
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, name')
      .eq('user_id', target_user_id)
      .single();

    if (!targetProfile) {
      console.error('[delete-user] Target profile not found');
      return new Response(
        JSON.stringify({ error: 'Not Found', message: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[delete-user] Deleting user: ${targetProfile.email} (${targetProfile.name})`);

    // DELETE RELATED DATA (in order to respect foreign keys)
    
    // 1. Delete benchmark results
    const { error: benchmarkError } = await supabaseAdmin
      .from('benchmark_results')
      .delete()
      .eq('user_id', target_user_id);
    
    if (benchmarkError) {
      console.error('[delete-user] Error deleting benchmark_results:', benchmarkError);
    } else {
      console.log('[delete-user] Deleted benchmark_results');
    }

    // 2. Delete athlete plans
    const { error: plansError } = await supabaseAdmin
      .from('athlete_plans')
      .delete()
      .eq('athlete_user_id', target_user_id);
    
    if (plansError) {
      console.error('[delete-user] Error deleting athlete_plans:', plansError);
    } else {
      console.log('[delete-user] Deleted athlete_plans');
    }

    // 3. Delete coach-athlete links (as athlete)
    const { error: coachAthletesError1 } = await supabaseAdmin
      .from('coach_athletes')
      .delete()
      .eq('athlete_id', target_user_id);
    
    if (coachAthletesError1) {
      console.error('[delete-user] Error deleting coach_athletes (as athlete):', coachAthletesError1);
    } else {
      console.log('[delete-user] Deleted coach_athletes (as athlete)');
    }

    // 4. Delete coach-athlete links (as coach)
    const { error: coachAthletesError2 } = await supabaseAdmin
      .from('coach_athletes')
      .delete()
      .eq('coach_id', target_user_id);
    
    if (coachAthletesError2) {
      console.error('[delete-user] Error deleting coach_athletes (as coach):', coachAthletesError2);
    } else {
      console.log('[delete-user] Deleted coach_athletes (as coach)');
    }

    // 5. Delete events
    const { error: eventsError } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('user_id', targetProfile.id);
    
    if (eventsError) {
      console.error('[delete-user] Error deleting events:', eventsError);
    } else {
      console.log('[delete-user] Deleted events');
    }

    // 6. Delete user roles
    const { error: rolesDeleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', target_user_id);
    
    if (rolesDeleteError) {
      console.error('[delete-user] Error deleting user_roles:', rolesDeleteError);
    } else {
      console.log('[delete-user] Deleted user_roles');
    }

    // 7. Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', target_user_id);
    
    if (profileError) {
      console.error('[delete-user] Error deleting profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Internal Error', message: 'Failed to delete profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('[delete-user] Deleted profile');

    // 8. Delete auth user
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(target_user_id);
    
    if (authDeleteError) {
      console.error('[delete-user] Error deleting auth user:', authDeleteError);
      return new Response(
        JSON.stringify({ error: 'Internal Error', message: 'Failed to delete auth user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[delete-user] SUCCESS: User ${target_user_id} permanently deleted by ${caller.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User and all related data permanently deleted',
        deleted_user_id: target_user_id,
        deleted_email: targetProfile.email
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[delete-user] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal Error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
