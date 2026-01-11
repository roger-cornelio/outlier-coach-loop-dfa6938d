-- Ensure RLS is fully enforced on coach_applications (including for table owner)
ALTER TABLE public.coach_applications FORCE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them correctly as PERMISSIVE (OR logic)
DROP POLICY IF EXISTS "Deny anonymous access to coach_applications" ON public.coach_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.coach_applications;
DROP POLICY IF EXISTS "Users can view own application" ON public.coach_applications;
DROP POLICY IF EXISTS "Authenticated users can submit coach applications" ON public.coach_applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON public.coach_applications;
DROP POLICY IF EXISTS "Users can update own pending application" ON public.coach_applications;

-- Create RESTRICTIVE policy to block anonymous access (must fail for anon)
CREATE POLICY "Block anonymous SELECT on coach_applications"
ON public.coach_applications
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- PERMISSIVE SELECT: Users can view their own applications
CREATE POLICY "Users can view own coach application"
ON public.coach_applications
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- PERMISSIVE SELECT: Admins can view all applications
CREATE POLICY "Admins can view all coach applications"
ON public.coach_applications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- PERMISSIVE SELECT: Superadmins can view all applications
CREATE POLICY "Superadmins can view all coach applications"
ON public.coach_applications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role));

-- PERMISSIVE INSERT: Authenticated users can submit applications
CREATE POLICY "Authenticated users can submit coach applications"
ON public.coach_applications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (auth_user_id IS NULL OR auth_user_id = auth.uid())
);

-- PERMISSIVE UPDATE: Users can update their own pending/rejected applications
CREATE POLICY "Users can update own pending application"
ON public.coach_applications
FOR UPDATE
TO authenticated
USING (
  auth_user_id = auth.uid() 
  AND status IN ('pending', 'rejected')
)
WITH CHECK (
  auth_user_id = auth.uid() 
  AND status IN ('pending', 'rejected')
);

-- PERMISSIVE UPDATE: Admins can update all applications
CREATE POLICY "Admins can update all coach applications"
ON public.coach_applications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- PERMISSIVE UPDATE: Superadmins can update all applications
CREATE POLICY "Superadmins can update all coach applications"
ON public.coach_applications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role));