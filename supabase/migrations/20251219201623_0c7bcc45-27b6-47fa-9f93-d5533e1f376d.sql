-- 1. Add auth_user_id column
ALTER TABLE public.coach_applications 
ADD COLUMN auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Backfill existing records from profiles
UPDATE public.coach_applications ca
SET auth_user_id = p.user_id
FROM public.profiles p
WHERE ca.user_id = p.id;

-- 3. Make auth_user_id NOT NULL after backfill (only if all records have been filled)
-- For safety, we'll create a unique index instead
CREATE UNIQUE INDEX idx_coach_applications_auth_user_id ON public.coach_applications(auth_user_id);

-- 4. Drop old RLS policies
DROP POLICY IF EXISTS "Users can insert own application" ON public.coach_applications;
DROP POLICY IF EXISTS "Users can view own application" ON public.coach_applications;
DROP POLICY IF EXISTS "Users can update own pending application" ON public.coach_applications;

-- 5. Create new RLS policies using auth.uid() directly
CREATE POLICY "Users can insert own application"
ON public.coach_applications
FOR INSERT
WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Users can view own application"
ON public.coach_applications
FOR SELECT
USING (auth_user_id = auth.uid());

CREATE POLICY "Users can update own pending application"
ON public.coach_applications
FOR UPDATE
USING (auth_user_id = auth.uid() AND status IN ('pending', 'rejected'))
WITH CHECK (auth_user_id = auth.uid() AND status IN ('pending', 'rejected'));