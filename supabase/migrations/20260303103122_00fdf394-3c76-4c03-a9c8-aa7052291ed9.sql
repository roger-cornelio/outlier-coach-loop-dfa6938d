-- Allow all authenticated users to read system_params
CREATE POLICY "Authenticated users can read system_params"
ON public.system_params
FOR SELECT
TO authenticated
USING (true);
