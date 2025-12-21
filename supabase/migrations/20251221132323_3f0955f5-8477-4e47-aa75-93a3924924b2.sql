-- Drop the existing function first (signature changed)
DROP FUNCTION IF EXISTS public.search_athlete_by_email(text);

-- Recreate the function to handle auth.users lookup and auto-create profiles
CREATE OR REPLACE FUNCTION public.search_athlete_by_email(_email text)
RETURNS TABLE(
  profile_id uuid, 
  user_id uuid, 
  name text, 
  email text, 
  coach_id uuid, 
  is_athlete boolean, 
  is_coach_or_admin boolean,
  profile_was_created boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _normalized_email text;
  _auth_user_id uuid;
  _auth_user_email text;
  _existing_profile_id uuid;
  _profile_created boolean := false;
BEGIN
  -- Verify caller is a coach or admin
  IF NOT public.has_role(_caller_id, 'coach') AND NOT public.has_role(_caller_id, 'admin') THEN
    RAISE EXCEPTION 'Only coaches and admins can search for athletes';
  END IF;

  -- Normalize email
  _normalized_email := lower(trim(_email));

  -- First, search in auth.users
  SELECT au.id, au.email INTO _auth_user_id, _auth_user_email
  FROM auth.users au
  WHERE lower(trim(au.email)) = _normalized_email
  LIMIT 1;

  -- If not found in auth.users, return empty
  IF _auth_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if profile exists for this auth user
  SELECT p.id INTO _existing_profile_id
  FROM public.profiles p
  WHERE p.user_id = _auth_user_id
  LIMIT 1;

  -- If profile doesn't exist, create it
  IF _existing_profile_id IS NULL THEN
    INSERT INTO public.profiles (user_id, email, name)
    VALUES (
      _auth_user_id, 
      _normalized_email,
      split_part(_normalized_email, '@', 1)
    )
    RETURNING id INTO _existing_profile_id;
    
    -- Also ensure user has the 'user' role (athlete)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_auth_user_id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    _profile_created := true;
  END IF;

  -- Return the profile data
  RETURN QUERY
  SELECT 
    p.id as profile_id,
    p.user_id,
    p.name,
    p.email,
    p.coach_id,
    -- Check if user has ONLY 'user' role (is athlete, not coach/admin)
    NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = p.user_id 
      AND ur.role IN ('coach', 'admin', 'superadmin')
    ) as is_athlete,
    -- Check if user is coach or admin
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = p.user_id 
      AND ur.role IN ('coach', 'admin', 'superadmin')
    ) as is_coach_or_admin,
    _profile_created as profile_was_created
  FROM public.profiles p
  WHERE p.id = _existing_profile_id
  LIMIT 1;
END;
$$;