
CREATE POLICY "Admins can view all athlete_races"
ON public.athlete_races
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
