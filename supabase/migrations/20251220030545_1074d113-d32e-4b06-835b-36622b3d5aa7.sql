-- Fix workouts.coach_id to reference public.profiles (not auth.users)
-- and align RLS checks with get_profile_id(auth.uid())

-- Drop existing policies (created previously)
DROP POLICY IF EXISTS "Coaches can view own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Coaches can insert own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Coaches can update own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Coaches can delete own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can view free published workouts" ON public.workouts;
DROP POLICY IF EXISTS "Admins can view all workouts" ON public.workouts;

-- Drop and recreate coach_id FK to point at public.profiles(id)
ALTER TABLE public.workouts
  DROP CONSTRAINT IF EXISTS workouts_coach_id_fkey;

ALTER TABLE public.workouts
  ADD CONSTRAINT workouts_coach_id_fkey
  FOREIGN KEY (coach_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Recreate policies
-- Coach can manage own workouts (coach_id is profile id)
CREATE POLICY "Coaches can view own workouts"
ON public.workouts
FOR SELECT
USING (get_profile_id(auth.uid()) = coach_id);

CREATE POLICY "Coaches can insert own workouts"
ON public.workouts
FOR INSERT
WITH CHECK (get_profile_id(auth.uid()) = coach_id);

CREATE POLICY "Coaches can update own workouts"
ON public.workouts
FOR UPDATE
USING (get_profile_id(auth.uid()) = coach_id);

CREATE POLICY "Coaches can delete own workouts"
ON public.workouts
FOR DELETE
USING (get_profile_id(auth.uid()) = coach_id);

-- Athletes/users can see only free + published workouts
CREATE POLICY "Users can view free published workouts"
ON public.workouts
FOR SELECT
USING (status = 'published' AND price = 0);

-- Admins (and superadmin via has_role logic) can view all workouts
CREATE POLICY "Admins can view all workouts"
ON public.workouts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_workouts_updated_at ON public.workouts(updated_at DESC);