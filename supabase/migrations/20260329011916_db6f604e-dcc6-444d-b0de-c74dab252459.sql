CREATE POLICY "Admins can delete suggestions"
  ON public.exercise_suggestions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));