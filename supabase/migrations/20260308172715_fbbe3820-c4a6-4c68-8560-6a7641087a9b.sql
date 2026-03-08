DROP POLICY IF EXISTS "Admins can manage all events" ON public.discovered_events;
DROP POLICY IF EXISTS "Authenticated can read validated events" ON public.discovered_events;
DROP POLICY IF EXISTS "Users can insert events" ON public.discovered_events;

CREATE POLICY "Admins can manage all events"
ON public.discovered_events
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Authenticated can read validated events"
ON public.discovered_events
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (status_validacao = 'VALIDADA');

CREATE POLICY "Users can insert events"
ON public.discovered_events
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);