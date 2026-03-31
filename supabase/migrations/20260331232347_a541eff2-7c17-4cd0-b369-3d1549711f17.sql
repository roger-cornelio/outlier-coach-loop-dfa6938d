CREATE TABLE public.plan_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_user_id UUID NOT NULL,
  coach_id UUID,
  current_plan TEXT NOT NULL,
  requested_plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.plan_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "athlete_own_requests" ON public.plan_change_requests
  FOR SELECT TO authenticated
  USING (athlete_user_id = auth.uid());

CREATE POLICY "athlete_insert_request" ON public.plan_change_requests
  FOR INSERT TO authenticated
  WITH CHECK (athlete_user_id = auth.uid());

CREATE POLICY "coach_view_requests" ON public.plan_change_requests
  FOR SELECT TO authenticated
  USING (coach_id = auth.uid());

CREATE POLICY "coach_update_requests" ON public.plan_change_requests
  FOR UPDATE TO authenticated
  USING (coach_id = auth.uid());