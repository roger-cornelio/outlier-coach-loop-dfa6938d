CREATE POLICY "Coaches can view linked athlete plans"
ON public.athlete_plans FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM public.coach_athletes ca
    WHERE ca.athlete_id = athlete_plans.athlete_user_id
      AND ca.coach_id = auth.uid()
  )
);