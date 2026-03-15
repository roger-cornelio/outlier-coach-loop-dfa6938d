ALTER TABLE public.athlete_races
ADD COLUMN IF NOT EXISTS partner_phone text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS partner_instagram text DEFAULT NULL;