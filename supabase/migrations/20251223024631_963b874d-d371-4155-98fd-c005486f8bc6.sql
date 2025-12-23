-- =============================================
-- POLÍTICAS EXPLÍCITAS DE NEGAÇÃO PARA ANON
-- O Postgres permite acesso anon por padrão se não houver policy específica
-- Estas policies bloqueiam explicitamente qualquer tentativa de leitura anônima
-- =============================================

-- 1) PROFILES - Bloquear anon explicitamente
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- 2) COACH_APPLICATIONS - Bloquear anon explicitamente
CREATE POLICY "Deny anonymous access to coach_applications"
ON public.coach_applications
FOR SELECT
TO anon
USING (false);

-- 3) EVENTS - Bloquear anon explicitamente
CREATE POLICY "Deny anonymous access to events"
ON public.events
FOR SELECT
TO anon
USING (false);

-- 4) BENCHMARK_RESULTS - Bloquear anon explicitamente
CREATE POLICY "Deny anonymous access to benchmark_results"
ON public.benchmark_results
FOR SELECT
TO anon
USING (false);

-- 5) ATHLETE_PLANS - Bloquear anon explicitamente
CREATE POLICY "Deny anonymous access to athlete_plans"
ON public.athlete_plans
FOR SELECT
TO anon
USING (false);

-- 6) USER_ROLES - Bloquear anon explicitamente
CREATE POLICY "Deny anonymous access to user_roles"
ON public.user_roles
FOR SELECT
TO anon
USING (false);

-- 7) COACH_ATHLETES - Bloquear anon explicitamente
CREATE POLICY "Deny anonymous access to coach_athletes"
ON public.coach_athletes
FOR SELECT
TO anon
USING (false);

-- 8) ADMIN_ALLOWLIST - Bloquear anon explicitamente
CREATE POLICY "Deny anonymous access to admin_allowlist"
ON public.admin_allowlist
FOR SELECT
TO anon
USING (false);

-- 9) WORKOUTS - Atualizar: permitir apenas published+free para anon, negar o resto
-- Primeiro, adicionar policy restritiva para anon
CREATE POLICY "Anonymous can only view free published workouts"
ON public.workouts
FOR SELECT
TO anon
USING (status = 'published'::workout_status AND price = 0);