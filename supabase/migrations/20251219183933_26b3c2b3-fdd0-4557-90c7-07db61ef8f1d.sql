-- Drop problematic recursive policy
DROP POLICY IF EXISTS "Coaches can view their athletes profiles" ON public.profiles;

-- Recreate coach policy using get_profile_id (SECURITY DEFINER function - avoids recursion)
CREATE POLICY "Coaches can view their athletes profiles" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND coach_id = get_profile_id(auth.uid())
);