-- Fix approve_coach_application to use auth_user_id directly
-- This handles leads that don't have a profile yet

CREATE OR REPLACE FUNCTION public.approve_coach_application(_application_id uuid, _admin_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _auth_user_id uuid;
  _app_email text;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve applications';
  END IF;

  -- Get the auth_user_id and email from the application
  SELECT auth_user_id, email INTO _auth_user_id, _app_email
  FROM public.coach_applications
  WHERE id = _application_id;

  IF _app_email IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Update application status
  UPDATE public.coach_applications
  SET 
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = public.get_profile_id(_admin_id)
  WHERE id = _application_id;

  -- If auth_user_id is set, add coach role directly
  IF _auth_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_auth_user_id, 'coach')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Note: If auth_user_id is NULL (lead without account), the role will be 
  -- assigned when they create an account and log in with the approved email

  RETURN true;
END;
$$;