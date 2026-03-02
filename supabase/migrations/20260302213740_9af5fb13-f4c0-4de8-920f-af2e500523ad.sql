
-- 1) benchmark_outlier_master: catálogo de treinos-teste
CREATE TABLE public.benchmark_outlier_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'mixed',
  difficulty_weight integer NOT NULL DEFAULT 5,
  expected_minutes integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.benchmark_outlier_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active outlier benchmarks"
  ON public.benchmark_outlier_master FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage outlier benchmarks"
  ON public.benchmark_outlier_master FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Block anon benchmark_outlier_master"
  ON public.benchmark_outlier_master FOR ALL
  USING (false);

-- 2) benchmark_outlier_targets: metas por nível/sexo/idade/divisão
CREATE TABLE public.benchmark_outlier_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_id uuid NOT NULL REFERENCES public.benchmark_outlier_master(id) ON DELETE CASCADE,
  sex text NOT NULL DEFAULT 'M',
  age_group text NOT NULL DEFAULT '25-29',
  division text NOT NULL DEFAULT 'PRO',
  level text NOT NULL DEFAULT 'OPEN',
  target_seconds integer NOT NULL,
  version text NOT NULL DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(benchmark_id, sex, age_group, division, level, version)
);

ALTER TABLE public.benchmark_outlier_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read outlier targets"
  ON public.benchmark_outlier_targets FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage outlier targets"
  ON public.benchmark_outlier_targets FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Block anon benchmark_outlier_targets"
  ON public.benchmark_outlier_targets FOR ALL
  USING (false);

-- 3) benchmark_outlier_results: resultados do atleta
CREATE TABLE public.benchmark_outlier_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  benchmark_id uuid NOT NULL REFERENCES public.benchmark_outlier_master(id) ON DELETE CASCADE,
  result_seconds integer NOT NULL,
  result_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.benchmark_outlier_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own outlier results"
  ON public.benchmark_outlier_results FOR INSERT
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Users can view own outlier results"
  ON public.benchmark_outlier_results FOR SELECT
  USING (auth.uid() = athlete_id);

CREATE POLICY "Users can delete own outlier results"
  ON public.benchmark_outlier_results FOR DELETE
  USING (auth.uid() = athlete_id);

CREATE POLICY "Coaches can view athlete outlier results"
  ON public.benchmark_outlier_results FOR SELECT
  USING (can_view_athlete_data(auth.uid(), athlete_id));

CREATE POLICY "Admins can view all outlier results"
  ON public.benchmark_outlier_results FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Block anon benchmark_outlier_results"
  ON public.benchmark_outlier_results FOR ALL
  USING (false);

-- 4) benchmark_outlier_progress: resumo calculado
CREATE TABLE public.benchmark_outlier_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  benchmark_id uuid NOT NULL REFERENCES public.benchmark_outlier_master(id) ON DELETE CASCADE,
  best_seconds integer,
  last_seconds integer,
  level_reached text NOT NULL DEFAULT 'OPEN',
  progress_pct numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(athlete_id, benchmark_id)
);

ALTER TABLE public.benchmark_outlier_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own outlier progress"
  ON public.benchmark_outlier_progress FOR SELECT
  USING (auth.uid() = athlete_id);

CREATE POLICY "Users can upsert own outlier progress"
  ON public.benchmark_outlier_progress FOR INSERT
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Users can update own outlier progress"
  ON public.benchmark_outlier_progress FOR UPDATE
  USING (auth.uid() = athlete_id);

CREATE POLICY "Coaches can view athlete outlier progress"
  ON public.benchmark_outlier_progress FOR SELECT
  USING (can_view_athlete_data(auth.uid(), athlete_id));

CREATE POLICY "Admins can view all outlier progress"
  ON public.benchmark_outlier_progress FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Block anon benchmark_outlier_progress"
  ON public.benchmark_outlier_progress FOR ALL
  USING (false);

-- Triggers for updated_at
CREATE TRIGGER update_benchmark_outlier_master_updated_at
  BEFORE UPDATE ON public.benchmark_outlier_master
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_benchmark_outlier_targets_updated_at
  BEFORE UPDATE ON public.benchmark_outlier_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_benchmark_outlier_progress_updated_at
  BEFORE UPDATE ON public.benchmark_outlier_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
