
-- Table: diagnostico_melhoria
CREATE TABLE public.diagnostico_melhoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id uuid NOT NULL,
  movement text NOT NULL,
  metric text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  your_score numeric NOT NULL DEFAULT 0,
  top_1 numeric NOT NULL DEFAULT 0,
  improvement_value numeric NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  total_improvement numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.diagnostico_melhoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diagnostico" ON public.diagnostico_melhoria FOR SELECT TO authenticated USING (auth.uid() = atleta_id);
CREATE POLICY "Users can insert own diagnostico" ON public.diagnostico_melhoria FOR INSERT TO authenticated WITH CHECK (auth.uid() = atleta_id);
CREATE POLICY "Users can delete own diagnostico" ON public.diagnostico_melhoria FOR DELETE TO authenticated USING (auth.uid() = atleta_id);
CREATE POLICY "Admins can view all diagnostico" ON public.diagnostico_melhoria FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Block anon diagnostico" ON public.diagnostico_melhoria FOR ALL TO anon USING (false);

-- Table: tempos_splits
CREATE TABLE public.tempos_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id uuid NOT NULL,
  split_name text NOT NULL,
  time text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tempos_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own splits" ON public.tempos_splits FOR SELECT TO authenticated USING (auth.uid() = atleta_id);
CREATE POLICY "Users can insert own splits" ON public.tempos_splits FOR INSERT TO authenticated WITH CHECK (auth.uid() = atleta_id);
CREATE POLICY "Users can delete own splits" ON public.tempos_splits FOR DELETE TO authenticated USING (auth.uid() = atleta_id);
CREATE POLICY "Admins can view all splits" ON public.tempos_splits FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Block anon splits" ON public.tempos_splits FOR ALL TO anon USING (false);
