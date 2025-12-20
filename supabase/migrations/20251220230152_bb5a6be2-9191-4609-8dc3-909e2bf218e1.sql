-- Make user_id nullable to allow public lead capture
ALTER TABLE public.coach_applications ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing INSERT policies that require auth
DROP POLICY IF EXISTS "Users can insert own application" ON public.coach_applications;
DROP POLICY IF EXISTS "Users can update own pending application" ON public.coach_applications;

-- Create policy to allow public insert (for lead capture without login)
CREATE POLICY "Public can submit coach applications"
ON public.coach_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Recreate update policy for authenticated users only
CREATE POLICY "Users can update own pending application"
ON public.coach_applications
FOR UPDATE
TO authenticated
USING ((auth_user_id = auth.uid()) AND (status = ANY (ARRAY['pending'::text, 'rejected'::text])))
WITH CHECK ((auth_user_id = auth.uid()) AND (status = ANY (ARRAY['pending'::text, 'rejected'::text])));