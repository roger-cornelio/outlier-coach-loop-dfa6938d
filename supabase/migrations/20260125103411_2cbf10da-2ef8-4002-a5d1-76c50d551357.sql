-- Permitir que atletas vejam seu próprio vínculo com o coach
-- Isso é necessário para exibir o nome do coach na tela de configuração

CREATE POLICY "Athletes can view their own coach link"
ON public.coach_athletes
FOR SELECT
USING (auth.uid() = athlete_id);

-- Permitir que atletas vejam o perfil público do coach vinculado
-- Isso é necessário para buscar o nome do coach após identificar o vínculo

CREATE POLICY "Athletes can view their linked coach profile"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.coach_athletes ca
    WHERE ca.athlete_id = auth.uid()
    AND ca.coach_id = profiles.user_id
  )
);