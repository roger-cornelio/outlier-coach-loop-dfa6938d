-- Criar constraint única para UPSERT por athlete_user_id + week_start
CREATE UNIQUE INDEX idx_athlete_plans_unique_athlete_week 
ON public.athlete_plans (athlete_user_id, week_start);