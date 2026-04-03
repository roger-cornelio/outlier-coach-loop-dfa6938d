
CREATE OR REPLACE FUNCTION public.deactivate_coach(_coach_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins/superadmins can deactivate coaches
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas admins podem desativar coaches';
  END IF;

  -- Remove coach role
  DELETE FROM public.user_roles WHERE user_id = _coach_user_id AND role = 'coach';

  -- Unlink all athletes from this coach
  DELETE FROM public.coach_athletes WHERE coach_id = _coach_user_id;

  -- Clear coach_id from athlete profiles
  UPDATE public.profiles SET coach_id = NULL WHERE coach_id = (
    SELECT id FROM public.profiles WHERE user_id = _coach_user_id LIMIT 1
  );

  -- Update coach application status
  UPDATE public.coach_applications SET status = 'deactivated' WHERE auth_user_id = _coach_user_id;

  RETURN true;
END;
$$;
