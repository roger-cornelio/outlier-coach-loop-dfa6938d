-- Update ensure_superadmin_role to include roger.bm2016@gmail.com
CREATE OR REPLACE FUNCTION public.ensure_superadmin_role(_user_id uuid, _email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  superadmin_emails text[] := ARRAY['roger.bm2016@gmail.com'];
  existing_role app_role;
BEGIN
  -- Check if email is in the superadmin list
  IF lower(_email) = ANY(superadmin_emails) THEN
    -- Check if user already has superadmin role
    SELECT role INTO existing_role
    FROM user_roles
    WHERE user_id = _user_id AND role = 'superadmin';
    
    IF existing_role IS NULL THEN
      -- Insert superadmin role
      INSERT INTO user_roles (user_id, role)
      VALUES (_user_id, 'superadmin')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;