
ALTER TABLE public.diagnostico_resumo
ADD COLUMN IF NOT EXISTS perfil_fisiologico jsonb DEFAULT NULL;

CREATE POLICY "Users can update own diagnostico_resumo"
ON public.diagnostico_resumo FOR UPDATE
TO authenticated
USING (auth.uid() = atleta_id)
WITH CHECK (auth.uid() = atleta_id);
