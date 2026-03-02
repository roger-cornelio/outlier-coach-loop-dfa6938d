
-- 1) Base Master: tempos base por estação (PRO M 25-29)
CREATE TABLE public.outlier_base_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL DEFAULT 'v1',
  station_key text NOT NULL,
  base_seconds integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(version, station_key)
);

ALTER TABLE public.outlier_base_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage outlier_base_master"
  ON public.outlier_base_master FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Authenticated can read active outlier_base_master"
  ON public.outlier_base_master FOR SELECT
  USING (true);

CREATE POLICY "Block anon outlier_base_master"
  ON public.outlier_base_master FOR ALL
  USING (false);

-- 2) Fatores: tier, sex, age, division
CREATE TABLE public.outlier_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL DEFAULT 'v1',
  factor_type text NOT NULL, -- 'tier', 'sex', 'age', 'division'
  factor_key text NOT NULL,
  factor_value numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(version, factor_type, factor_key)
);

ALTER TABLE public.outlier_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage outlier_factors"
  ON public.outlier_factors FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Authenticated can read outlier_factors"
  ON public.outlier_factors FOR SELECT
  USING (true);

CREATE POLICY "Block anon outlier_factors"
  ON public.outlier_factors FOR ALL
  USING (false);

-- 3) Overrides manuais (opcional, prioridade sobre derivação)
CREATE TABLE public.outlier_reference_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL DEFAULT 'v1',
  sex text NOT NULL,
  age_group text NOT NULL,
  division text NOT NULL,
  tier text NOT NULL,
  station_key text NOT NULL,
  override_seconds integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(version, sex, age_group, division, tier, station_key)
);

ALTER TABLE public.outlier_reference_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage outlier_reference_overrides"
  ON public.outlier_reference_overrides FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Authenticated can read outlier_reference_overrides"
  ON public.outlier_reference_overrides FOR SELECT
  USING (true);

CREATE POLICY "Block anon outlier_reference_overrides"
  ON public.outlier_reference_overrides FOR ALL
  USING (false);

-- Triggers para updated_at
CREATE TRIGGER update_outlier_base_master_updated_at
  BEFORE UPDATE ON public.outlier_base_master
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_outlier_factors_updated_at
  BEFORE UPDATE ON public.outlier_factors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_outlier_reference_overrides_updated_at
  BEFORE UPDATE ON public.outlier_reference_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
