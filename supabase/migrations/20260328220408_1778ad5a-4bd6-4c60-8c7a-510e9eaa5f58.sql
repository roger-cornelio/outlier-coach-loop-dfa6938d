
-- Add onboarding columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_experience text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_goal text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_target_race text;

-- Drop and recreate view with new columns
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
    p.onboarding_experience,
    p.onboarding_goal,
    p.onboarding_target_race,
    EXTRACT(day FROM now() - COALESCE(p.last_active_at, p.created_at))::integer AS days_inactive,
    (( SELECT count(*) AS count
           FROM benchmark_results br
          WHERE br.user_id = ca.athlete_id AND br.completed = true AND br.created_at >= (now() - '7 days'::interval)))::integer AS workouts_last_7_days,
    (( SELECT count(*) AS count
           FROM athlete_plans ap
          WHERE ap.athlete_user_id = ca.athlete_id AND ap.status = 'published'::text AND ap.week_start >= date_trunc('week'::text, now())::date
         LIMIT 1))::integer AS has_plan_this_week,
    (( SELECT count(*) AS count
           FROM benchmark_results br
          WHERE br.user_id = ca.athlete_id))::integer AS total_benchmarks
   FROM coach_athletes ca
     JOIN profiles p ON p.user_id = ca.athlete_id;
