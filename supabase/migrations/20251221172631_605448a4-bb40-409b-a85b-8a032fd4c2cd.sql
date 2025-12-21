-- Remove old unique constraint that only allowed one plan per week
ALTER TABLE public.athlete_plans 
DROP CONSTRAINT IF EXISTS athlete_plans_athlete_user_id_week_start_key;

-- Add new unique constraint: one workout per athlete per scheduled_date per coach
-- This allows the same athlete to have different coaches publishing to different dates
-- But prevents the same coach from publishing twice to the same athlete on the same date
CREATE UNIQUE INDEX IF NOT EXISTS idx_athlete_plans_unique_schedule
ON public.athlete_plans (athlete_user_id, coach_id, scheduled_date)
WHERE scheduled_date IS NOT NULL;

-- Add comment for documentation
COMMENT ON INDEX idx_athlete_plans_unique_schedule IS 'Ensures one workout per athlete per scheduled_date per coach. Allows multiple coaches to publish to same date.';

-- Create partial index for faster lookups on published plans with scheduled_date
CREATE INDEX IF NOT EXISTS idx_athlete_plans_published_scheduled
ON public.athlete_plans (athlete_user_id, scheduled_date)
WHERE status = 'published' AND scheduled_date IS NOT NULL;