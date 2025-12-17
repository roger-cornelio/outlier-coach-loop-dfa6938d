-- Create function to check if user is coach or admin using plpgsql
CREATE OR REPLACE FUNCTION public.is_coach_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (role::text = 'admin' OR role::text = 'coach')
  );
END;
$$;