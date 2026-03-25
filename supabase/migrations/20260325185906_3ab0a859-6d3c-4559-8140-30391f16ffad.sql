
-- Drop function first, then view, then recreate both
DROP FUNCTION IF EXISTS public.get_coach_overview(uuid);
DROP VIEW IF EXISTS public.coach_athlete_overview;

CREATE VIEW public.coach_athlete_overview AS
SELECT ca.coach_id,
    ca.athlete_id,
    p.name AS athlete_name,
    p.email AS athlete_email,
    p.sexo,
    p.status AS account_status,
    p.last_active_at,
    p.peso,
    p.altura,
    p.training_level,
    p.unavailable_equipment,
    p.equipment_notes,
    (EXTRACT(day FROM (now() - COALESCE(p.last_active_at, p.created_at))))::integer AS days_inactive,
    (( SELECT count(*) AS count
           FROM benchmark_results br
          WHERE ((br.user_id = ca.athlete_id) AND (br.completed = true) AND (br.created_at >= (now() - '7 days'::interval)))))::integer AS workouts_last_7_days,
    (( SELECT count(*) AS count
           FROM athlete_plans ap
          WHERE ((ap.athlete_user_id = ca.athlete_id) AND (ap.status = 'published'::text) AND (ap.week_start >= (date_trunc('week'::text, now()))::date))
         LIMIT 1))::integer AS has_plan_this_week,
    (( SELECT count(*) AS count
           FROM benchmark_results br
          WHERE (br.user_id = ca.athlete_id)))::integer AS total_benchmarks
   FROM (coach_athletes ca
     JOIN profiles p ON ((p.user_id = ca.athlete_id)));

CREATE FUNCTION public.get_coach_overview(_coach_id uuid)
 RETURNS TABLE(coach_id uuid, athlete_id uuid, athlete_name text, athlete_email text, sexo text, account_status text, last_active_at timestamp with time zone, peso numeric, altura integer, training_level text, unavailable_equipment jsonb, equipment_notes text, days_inactive integer, workouts_last_7_days integer, has_plan_this_week integer, total_benchmarks integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT * FROM public.coach_athlete_overview cao
  WHERE cao.coach_id = _coach_id;
$$;
