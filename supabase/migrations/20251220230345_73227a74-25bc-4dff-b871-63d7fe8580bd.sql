-- Create function to grant coach role on login if email has approved application
-- This handles the case where a lead submitted their contact, got approved, 
-- then creates an account afterwards

CREATE OR REPLACE FUNCTION public.sync_coach_role_on_login(_user_id uuid, _email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _approved_app_id uuid;
BEGIN
  -- Check if there's an approved application for this email
  SELECT id INTO _approved_app_id
  FROM public.coach_applications
  WHERE email = _email
    AND status = 'approved'
  LIMIT 1;

  -- If approved application exists, grant coach role
  IF _approved_app_id IS NOT NULL THEN
    -- Grant coach role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'coach')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Update the application with auth_user_id (link the account)
    UPDATE public.coach_applications
    SET auth_user_id = _user_id
    WHERE id = _approved_app_id
      AND auth_user_id IS NULL;

    RETURN true;
  END IF;

  RETURN false;
END;
$$;