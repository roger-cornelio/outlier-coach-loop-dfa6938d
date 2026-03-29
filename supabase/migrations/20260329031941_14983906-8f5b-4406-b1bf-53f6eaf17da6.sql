
-- 1. Update unlink_current_coach to archive active plans before unlinking
CREATE OR REPLACE FUNCTION public.unlink_current_coach(_athlete_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() != _athlete_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.athlete_plans 
  SET status = 'archived'
  WHERE athlete_user_id = _athlete_id 
    AND status = 'published'
    AND week_start >= date_trunc('week', now())::date;

  DELETE FROM public.coach_athletes WHERE athlete_id = _athlete_id;

  UPDATE public.profiles SET coach_id = NULL WHERE user_id = _athlete_id;

  RETURN true;
END;
$function$;

-- 2. Fix RLS UPDATE policy to allow current linked coach
DROP POLICY IF EXISTS "Coaches can update their plans" ON public.athlete_plans;

CREATE POLICY "Coaches can update their plans" ON public.athlete_plans
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_athletes ca
      WHERE ca.athlete_id = athlete_plans.athlete_user_id
        AND ca.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_athletes ca
      WHERE ca.athlete_id = athlete_plans.athlete_user_id
        AND ca.coach_id = auth.uid()
    )
  );
