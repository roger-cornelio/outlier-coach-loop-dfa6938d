
-- Remove the existing unique constraint on (athlete_id, coach_id)
ALTER TABLE public.coach_link_requests DROP CONSTRAINT IF EXISTS coach_link_requests_athlete_id_coach_id_key;

-- Create partial unique index: only one pending request per athlete-coach pair
CREATE UNIQUE INDEX IF NOT EXISTS coach_link_requests_pending_unique 
ON public.coach_link_requests (athlete_id, coach_id) 
WHERE status = 'pending';
