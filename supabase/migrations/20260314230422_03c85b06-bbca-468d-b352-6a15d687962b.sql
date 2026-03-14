
ALTER TABLE public.diagnostico_resumo
ADD COLUMN IF NOT EXISTS prioridades_treino jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS direcionamento text DEFAULT NULL;
