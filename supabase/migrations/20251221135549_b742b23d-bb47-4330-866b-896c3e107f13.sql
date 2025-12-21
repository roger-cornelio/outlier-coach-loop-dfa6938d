-- Coach/Athlete linking: enforce coach_athletes as source of truth

-- 1) Ensure table exists with required columns
CREATE TABLE IF NOT EXISTS public.coach_athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  athlete_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure missing columns (safe for existing installs)
ALTER TABLE public.coach_athletes
  ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.coach_athletes
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.coach_athletes
  ADD COLUMN IF NOT EXISTS coach_id uuid;
ALTER TABLE public.coach_athletes
  ADD COLUMN IF NOT EXISTS athlete_id uuid;
ALTER TABLE public.coach_athletes
  ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.coach_athletes
  ALTER COLUMN created_at SET DEFAULT now();

-- Backfill id/created_at if null (legacy rows)
UPDATE public.coach_athletes
SET id = COALESCE(id, gen_random_uuid()),
    created_at = COALESCE(created_at, now())
WHERE id IS NULL OR created_at IS NULL;

-- Enforce NOT NULL (after backfill)
ALTER TABLE public.coach_athletes
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN coach_id SET NOT NULL,
  ALTER COLUMN athlete_id SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

-- 1b) Foreign keys (requested): auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coach_athletes_coach_id_fkey'
  ) THEN
    ALTER TABLE public.coach_athletes
      ADD CONSTRAINT coach_athletes_coach_id_fkey
      FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coach_athletes_athlete_id_fkey'
  ) THEN
    ALTER TABLE public.coach_athletes
      ADD CONSTRAINT coach_athletes_athlete_id_fkey
      FOREIGN KEY (athlete_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 1c) Unique (coach_id, athlete_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coach_athletes_unique_coach_athlete'
  ) THEN
    ALTER TABLE public.coach_athletes
      ADD CONSTRAINT coach_athletes_unique_coach_athlete UNIQUE (coach_id, athlete_id);
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_coach_athletes_coach_id ON public.coach_athletes (coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_athletes_athlete_id ON public.coach_athletes (athlete_id);

-- 2) RLS for coach_athletes
ALTER TABLE public.coach_athletes ENABLE ROW LEVEL SECURITY;

-- Coaches: select own links
DROP POLICY IF EXISTS "Coaches can view their athlete links" ON public.coach_athletes;
CREATE POLICY "Coaches can view their athlete links"
ON public.coach_athletes
FOR SELECT
TO authenticated
USING (auth.uid() = coach_id);

-- Coaches: insert own links
DROP POLICY IF EXISTS "Coaches can insert their athlete links" ON public.coach_athletes;
CREATE POLICY "Coaches can insert their athlete links"
ON public.coach_athletes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = coach_id);

-- Coaches: delete own links
DROP POLICY IF EXISTS "Coaches can delete their athlete links" ON public.coach_athletes;
CREATE POLICY "Coaches can delete their athlete links"
ON public.coach_athletes
FOR DELETE
TO authenticated
USING (auth.uid() = coach_id);

-- Keep existing admin policies as-is (if they exist)

-- 4) Profiles: allow coach to read profiles of linked athletes via coach_athletes
DROP POLICY IF EXISTS "Coaches can view their athletes profiles" ON public.profiles;
CREATE POLICY "Coaches can view their athletes profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'coach'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.coach_athletes ca
    WHERE ca.coach_id = auth.uid()
      AND ca.athlete_id = profiles.user_id
  )
);
