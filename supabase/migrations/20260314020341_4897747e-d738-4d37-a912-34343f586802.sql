
-- RPC function to query the coach_athlete_overview view
CREATE OR REPLACE FUNCTION public.get_coach_overview(_coach_id uuid)
RETURNS TABLE (
  coach_id uuid,
  athlete_id uuid,
  athlete_name text,
  athlete_email text,
  sexo text,
  account_status text,
  last_active_at timestamptz,
  peso numeric,
  altura int,
  training_level text,
  days_inactive int,
  workouts_last_7_days int,
  has_plan_this_week int,
  total_benchmarks int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT * FROM public.coach_athlete_overview cao
  WHERE cao.coach_id = _coach_id;
$$;
