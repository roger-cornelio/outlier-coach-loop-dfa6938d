
DROP POLICY IF EXISTS "Users can insert discovery logs" ON public.event_discovery_logs;
DROP POLICY IF EXISTS "Users can read own discovery logs" ON public.event_discovery_logs;
DROP POLICY IF EXISTS "Admins can manage discovery logs" ON public.event_discovery_logs;
DROP POLICY IF EXISTS "Users can insert review queue" ON public.event_review_queue;
DROP POLICY IF EXISTS "Admins can manage review queue" ON public.event_review_queue;

CREATE POLICY "Users can insert discovery logs"
ON public.event_discovery_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can read own discovery logs"
ON public.event_discovery_logs
FOR SELECT
TO authenticated
USING (requested_by = auth.uid());

CREATE POLICY "Admins can manage discovery logs"
ON public.event_discovery_logs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Users can insert review queue"
ON public.event_review_queue
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage review queue"
ON public.event_review_queue
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));
