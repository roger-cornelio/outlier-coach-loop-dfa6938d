CREATE POLICY "Admins can delete diagnostic_leads"
ON public.diagnostic_leads
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));