-- Add scheduled_date column to athlete_plans
-- This is the date when the workout should appear on the athlete's calendar
ALTER TABLE public.athlete_plans 
ADD COLUMN IF NOT EXISTS scheduled_date date;

-- Add scheduled_time column (optional, for ordering within the same day)
ALTER TABLE public.athlete_plans 
ADD COLUMN IF NOT EXISTS scheduled_time time;

-- Create index for efficient querying by date range
CREATE INDEX IF NOT EXISTS idx_athlete_plans_scheduled_date 
ON public.athlete_plans (athlete_user_id, scheduled_date);

-- Add comment for documentation
COMMENT ON COLUMN public.athlete_plans.scheduled_date IS 'The date when this workout should appear on athlete calendar. Required for new publications.';
COMMENT ON COLUMN public.athlete_plans.scheduled_time IS 'Optional time for ordering workouts within the same day.';