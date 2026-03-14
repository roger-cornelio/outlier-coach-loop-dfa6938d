
-- View: coach_athlete_overview
-- Returns vital athlete data for the coach dashboard without loading full workout JSON
CREATE OR REPLACE VIEW public.coach_athlete_overview AS
SELECT
  ca.coach_id,
  ca.athlete_id,
  p.name AS athlete_name,
  p.email AS athlete_email,
  p.sexo,
  p.status AS account_status,
  p.last_active_at,
  p.peso,
  p.altura,
  p.training_level,
  -- Days since last activity
  EXTRACT(DAY FROM (now() - COALESCE(p.last_active_at, p.created_at)))::int AS days_inactive,
  -- Count of workout completions in last 7 days
  (
    SELECT COUNT(*)
    FROM public.benchmark_results br
    WHERE br.user_id = ca.athlete_id
      AND br.completed = true
      AND br.created_at >= (now() - interval '7 days')
  )::int AS workouts_last_7_days,
  -- Count of planned workouts (from athlete_plans) in current week
  (
    SELECT COUNT(*)
    FROM public.athlete_plans ap
    WHERE ap.athlete_user_id = ca.athlete_id
      AND ap.status = 'published'
      AND ap.week_start >= date_trunc('week', now())::date
    LIMIT 1
  )::int AS has_plan_this_week,
  -- Total benchmark results (training age proxy)
  (
    SELECT COUNT(*)
    FROM public.benchmark_results br
    WHERE br.user_id = ca.athlete_id
  )::int AS total_benchmarks
FROM public.coach_athletes ca
JOIN public.profiles p ON p.user_id = ca.athlete_id;

-- RLS: Views inherit the RLS of the underlying tables, but we add a security barrier
ALTER VIEW public.coach_athlete_overview SET (security_invoker = true);
