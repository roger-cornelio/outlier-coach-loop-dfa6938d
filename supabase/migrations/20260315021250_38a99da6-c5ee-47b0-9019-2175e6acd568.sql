
-- Users can see their own created events (manual registrations)
CREATE POLICY "Users can read own created events"
ON public.discovered_events
FOR SELECT
TO authenticated
USING (created_by = auth.uid());
