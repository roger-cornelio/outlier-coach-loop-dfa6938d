-- ================================================
-- FIX: RLS policies para athlete_plans
-- O vínculo coach-atleta está em coach_athletes, não em profiles.coach_id
-- ================================================

-- Primeiro, remover policies existentes de INSERT/UPDATE que estão incorretas
DROP POLICY IF EXISTS "Coaches can insert plans for linked athletes" ON public.athlete_plans;
DROP POLICY IF EXISTS "Coaches can update their plans" ON public.athlete_plans;

-- ================================================
-- INSERT: Coach pode inserir planos para atletas vinculados via coach_athletes
-- ================================================
CREATE POLICY "Coaches can insert plans for linked athletes" 
ON public.athlete_plans 
FOR INSERT 
WITH CHECK (
  -- O coach_id no plano deve ser o profile.id do coach autenticado
  coach_id = get_profile_id(auth.uid())
  -- E o atleta deve estar vinculado ao coach na tabela coach_athletes
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes ca
    WHERE ca.athlete_id = athlete_user_id
      AND ca.coach_id = auth.uid()
  )
);

-- ================================================
-- UPDATE: Mesma regra do INSERT
-- ================================================
CREATE POLICY "Coaches can update their plans" 
ON public.athlete_plans 
FOR UPDATE 
USING (
  coach_id = get_profile_id(auth.uid())
)
WITH CHECK (
  coach_id = get_profile_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes ca
    WHERE ca.athlete_id = athlete_user_id
      AND ca.coach_id = auth.uid()
  )
);