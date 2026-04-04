DROP FUNCTION public.get_coach_overview(uuid);

CREATE FUNCTION public.get_coach_overview(_coach_id uuid)
RETURNS TABLE(
  coach_id uuid,
  athlete_id uuid,
  athlete_name text,
  athlete_email text,
  sexo text,
  account_status text,
  last_active_at timestamp with time zone,
  peso numeric,
  altura integer,
  training_level text,
  unavailable_equipment jsonb,
  equipment_notes text,
  onboarding_experience text,
  onboarding_goal text,
  onboarding_target_race text,
  days_inactive integer,
  workouts_last_7_days integer,
  has_plan_this_week integer,
  total_benchmarks integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.coach_athlete_overview cao
  WHERE cao.coach_id = _coach_id;
$$;