-- =============================================
-- CORREÇÃO DEFINITIVA: Adicionar políticas PERMISSIVAS que exigem autenticação
-- O problema: todas as policies atuais são RESTRICTIVE (AS RESTRICTIVE)
-- Quando NÃO há policies PERMISSIVE, o Postgres permite acesso por padrão!
-- Solução: Criar policies PERMISSIVE que exigem auth.uid() IS NOT NULL
-- =============================================

-- 1) PROFILES - Converter policies existentes para PERMISSIVE corretamente
-- Primeiro, dropar e recriar as policies de SELECT como PERMISSIVE

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can view their athletes profiles" ON public.profiles;

-- Recriar como PERMISSIVE (padrão) - exigem autenticação
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Coaches can view their athletes profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_athletes ca
    WHERE ca.coach_id = auth.uid() AND ca.athlete_id = profiles.user_id
  )
);


-- 2) COACH_APPLICATIONS - Garantir que SELECT exige autenticação
DROP POLICY IF EXISTS "Admins can view all applications" ON public.coach_applications;
DROP POLICY IF EXISTS "Users can view own application" ON public.coach_applications;

CREATE POLICY "Admins can view all applications"
ON public.coach_applications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own application"
ON public.coach_applications
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());


-- 3) ADMIN_ALLOWLIST - Bloquear acesso anônimo
DROP POLICY IF EXISTS "Superadmins can view allowlist" ON public.admin_allowlist;

CREATE POLICY "Superadmins can view allowlist"
ON public.admin_allowlist
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role));

ALTER TABLE public.admin_allowlist FORCE ROW LEVEL SECURITY;


-- 4) BENCHMARK_RESULTS - Garantir que SELECT exige autenticação
DROP POLICY IF EXISTS "Users can view their own benchmark results" ON public.benchmark_results;
DROP POLICY IF EXISTS "view_benchmark_results_policy" ON public.benchmark_results;

CREATE POLICY "Users can view their own benchmark results"
ON public.benchmark_results
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Coaches and admins can view athlete benchmark results"
ON public.benchmark_results
FOR SELECT
TO authenticated
USING (public.can_view_athlete_data(auth.uid(), user_id));

ALTER TABLE public.benchmark_results FORCE ROW LEVEL SECURITY;


-- 5) ATHLETE_PLANS - Garantir que SELECT exige autenticação
DROP POLICY IF EXISTS "Athletes can view their own plans" ON public.athlete_plans;
DROP POLICY IF EXISTS "Coaches can view plans they created" ON public.athlete_plans;
DROP POLICY IF EXISTS "Admins can view all plans" ON public.athlete_plans;

CREATE POLICY "Athletes can view their own plans"
ON public.athlete_plans
FOR SELECT
TO authenticated
USING (auth.uid() = athlete_user_id);

CREATE POLICY "Coaches can view plans they created"
ON public.athlete_plans
FOR SELECT
TO authenticated
USING (coach_id = public.get_profile_id(auth.uid()));

CREATE POLICY "Admins can view all plans"
ON public.athlete_plans
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.athlete_plans FORCE ROW LEVEL SECURITY;


-- 6) EVENTS - Garantir que SELECT exige autenticação
DROP POLICY IF EXISTS "Users can view own events" ON public.events;
DROP POLICY IF EXISTS "Admins can view all events" ON public.events;
DROP POLICY IF EXISTS "Coaches can view athlete events" ON public.events;

CREATE POLICY "Users can view own events"
ON public.events
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

CREATE POLICY "Admins can view all events"
ON public.events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Coaches can view athlete events"
ON public.events
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach'::app_role) AND 
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = events.user_id 
    AND p.coach_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  )
);

ALTER TABLE public.events FORCE ROW LEVEL SECURITY;


-- 7) USER_ROLES - Garantir que SELECT exige autenticação
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;


-- 8) COACH_ATHLETES - Garantir que SELECT exige autenticação
DROP POLICY IF EXISTS "Coaches can view their athlete links" ON public.coach_athletes;
DROP POLICY IF EXISTS "Admins can view all coach-athlete links" ON public.coach_athletes;

CREATE POLICY "Coaches can view their athlete links"
ON public.coach_athletes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'coach'::app_role) AND auth.uid() = coach_id);

CREATE POLICY "Admins can view all coach-athlete links"
ON public.coach_athletes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.coach_athletes FORCE ROW LEVEL SECURITY;


-- 9) WORKOUTS - Garantir que SELECT exige autenticação
DROP POLICY IF EXISTS "Coaches can view own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Admins can view all workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can view free published workouts" ON public.workouts;

CREATE POLICY "Coaches can view own workouts"
ON public.workouts
FOR SELECT
TO authenticated
USING (public.get_profile_id(auth.uid()) = coach_id);

CREATE POLICY "Admins can view all workouts"
ON public.workouts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view free published workouts"
ON public.workouts
FOR SELECT
TO authenticated
USING (status = 'published'::workout_status AND price = 0);

ALTER TABLE public.workouts FORCE ROW LEVEL SECURITY;