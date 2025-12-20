-- Fix coach approval + login sync to use user_roles as source of truth

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

  -- If auth_user_id is NULL, try to resolve it from profiles by email
  IF _auth_user_id IS NULL THEN
    SELECT p.user_id INTO _auth_user_id
    FROM public.profiles p
    WHERE lower(p.email) = lower(_app_email)
    LIMIT 1;

    IF _auth_user_id IS NOT NULL THEN
      UPDATE public.coach_applications
      SET auth_user_id = _auth_user_id
      WHERE id = _application_id
        AND auth_user_id IS NULL;
    END IF;
  END IF;

  -- Ensure role=coach exists for that auth user (source of truth)
  IF _auth_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_auth_user_id, 'coach')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN true;
END;
$$;


CREATE OR REPLACE FUNCTION public.sync_coach_role_on_login(_user_id uuid, _email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _approved_app_id uuid;
BEGIN
  -- Check if there's an approved application for this email (case-insensitive)
  SELECT id INTO _approved_app_id
  FROM public.coach_applications
  WHERE lower(email) = lower(trim(_email))
    AND status = 'approved'
  LIMIT 1;

  -- If approved application exists, grant coach role
  IF _approved_app_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'coach')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Link the account to the application (only if not linked yet)
    UPDATE public.coach_applications
    SET auth_user_id = _user_id
    WHERE id = _approved_app_id
      AND auth_user_id IS NULL;

    RETURN true;
  END IF;

  RETURN false;
END;
$$;
