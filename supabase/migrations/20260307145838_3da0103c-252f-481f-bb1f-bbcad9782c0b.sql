
-- Add resumo_performance and texto_ia storage to a new table for the athlete diagnostic session
CREATE TABLE IF NOT EXISTS public.diagnostico_resumo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id uuid NOT NULL,
  posicao_categoria text,
  posicao_geral text,
  run_total text,
  workout_total text,
  texto_ia text,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.diagnostico_resumo ENABLE ROW LEVEL SECURITY;

-- Block anon
CREATE POLICY "Block anon diagnostico_resumo" ON public.diagnostico_resumo AS RESTRICTIVE FOR ALL TO anon USING (false);

-- Users can view own
CREATE POLICY "Users can view own diagnostico_resumo" ON public.diagnostico_resumo FOR SELECT TO authenticated USING (auth.uid() = atleta_id);

-- Users can insert own
CREATE POLICY "Users can insert own diagnostico_resumo" ON public.diagnostico_resumo FOR INSERT TO authenticated WITH CHECK (auth.uid() = atleta_id);

-- Users can delete own
CREATE POLICY "Users can delete own diagnostico_resumo" ON public.diagnostico_resumo FOR DELETE TO authenticated USING (auth.uid() = atleta_id);

-- Admins can view all
CREATE POLICY "Admins can view all diagnostico_resumo" ON public.diagnostico_resumo FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
