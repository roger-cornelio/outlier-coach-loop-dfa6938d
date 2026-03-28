
CREATE OR REPLACE FUNCTION public.unlink_current_coach(_athlete_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate caller is the athlete
  IF auth.uid() != _athlete_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Remove from coach_athletes
  DELETE FROM public.coach_athletes WHERE athlete_id = _athlete_id;

  -- Clear coach_id in profiles
  UPDATE public.profiles SET coach_id = NULL WHERE user_id = _athlete_id;

  RETURN true;
END;
$$;
