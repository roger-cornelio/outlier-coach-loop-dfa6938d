
-- Function to search for linkable athletes by email (for coaches)
CREATE OR REPLACE FUNCTION public.search_athlete_by_email(_email text)
RETURNS TABLE(
  profile_id uuid,
  user_id uuid,
  name text,
  email text,
  coach_id uuid,
  is_athlete boolean,
  is_coach_or_admin boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id uuid := auth.uid();
BEGIN
  -- Verify caller is a coach
  IF NOT public.has_role(_caller_id, 'coach') AND NOT public.has_role(_caller_id, 'admin') THEN
    RAISE EXCEPTION 'Only coaches and admins can search for athletes';
  END IF;

  RETURN QUERY
  SELECT 
    p.id as profile_id,
    p.user_id,
    p.name,
    p.email,
    p.coach_id,
    -- Check if user has ONLY 'user' role (athlete)
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
    ) as is_coach_or_admin
  FROM public.profiles p
  WHERE lower(p.email) = lower(trim(_email))
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.search_athlete_by_email(text) TO authenticated;
