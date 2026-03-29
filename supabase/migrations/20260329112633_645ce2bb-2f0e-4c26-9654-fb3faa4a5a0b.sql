
CREATE OR REPLACE FUNCTION public.check_profile_exists_by_name(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(_name))
  )
$$;

GRANT EXECUTE ON FUNCTION public.check_profile_exists_by_name(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_profile_exists_by_name(text) TO authenticated;
