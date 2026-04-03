-- Drop the overly permissive insert policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- More restrictive: users can only insert notifications for themselves
CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());