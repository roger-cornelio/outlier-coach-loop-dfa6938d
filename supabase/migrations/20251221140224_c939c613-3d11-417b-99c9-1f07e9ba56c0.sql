-- Tighten coach_athletes policies to coaches only (prevents privilege escalation)

-- coach_athletes SELECT/INSERT/DELETE for coaches only
DROP POLICY IF EXISTS "Coaches can view their athlete links" ON public.coach_athletes;
CREATE POLICY "Coaches can view their athlete links"
ON public.coach_athletes
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'coach'::public.app_role) AND auth.uid() = coach_id);

DROP POLICY IF EXISTS "Coaches can insert their athlete links" ON public.coach_athletes;
CREATE POLICY "Coaches can insert their athlete links"
ON public.coach_athletes
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'coach'::public.app_role) AND auth.uid() = coach_id);

DROP POLICY IF EXISTS "Coaches can delete their athlete links" ON public.coach_athletes;
CREATE POLICY "Coaches can delete their athlete links"
ON public.coach_athletes
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'coach'::public.app_role) AND auth.uid() = coach_id);

-- Profiles: allow select if linked in coach_athletes (coach-only insert makes this safe)
DROP POLICY IF EXISTS "Coaches can view their athletes profiles" ON public.profiles;
CREATE POLICY "Coaches can view their athletes profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.coach_athletes ca
    WHERE ca.coach_id = auth.uid()
      AND ca.athlete_id = profiles.user_id
  )
);
