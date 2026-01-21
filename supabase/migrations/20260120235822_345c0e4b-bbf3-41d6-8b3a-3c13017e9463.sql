-- =============================================
-- Master Benchmarks System: Tables for derivation
-- =============================================

-- 1) Master table: PRO Male base values (the source of truth)
CREATE TABLE public.benchmark_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Always PRO Male, but we store for clarity
  tier TEXT NOT NULL DEFAULT 'hyrox_pro' CHECK (tier = 'hyrox_pro'),
  gender TEXT NOT NULL DEFAULT 'M' CHECK (gender = 'M'),
  
  -- Individual metric times in seconds
  run_avg_sec INTEGER NOT NULL CHECK (run_avg_sec > 0),
  roxzone_sec INTEGER NOT NULL CHECK (roxzone_sec > 0),
  ski_sec INTEGER NOT NULL CHECK (ski_sec > 0),
  sled_push_sec INTEGER NOT NULL CHECK (sled_push_sec > 0),
  sled_pull_sec INTEGER NOT NULL CHECK (sled_pull_sec > 0),
  bbj_sec INTEGER NOT NULL CHECK (bbj_sec > 0),
  row_sec INTEGER NOT NULL CHECK (row_sec > 0),
  farmers_sec INTEGER NOT NULL CHECK (farmers_sec > 0),
  sandbag_sec INTEGER NOT NULL CHECK (sandbag_sec > 0),
  wallballs_sec INTEGER NOT NULL CHECK (wallballs_sec > 0),
  
  version TEXT NOT NULL DEFAULT 'v1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT unique_master_version UNIQUE (version)
);

-- 2) Deltas table: adjustments by tier, gender, and age_group
CREATE TABLE public.benchmark_deltas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delta_type TEXT NOT NULL CHECK (delta_type IN ('tier', 'gender', 'age_group')),
  delta_key TEXT NOT NULL, -- e.g., 'iniciante', 'F', '40-44'
  
  -- Delta in seconds (positive = slower/worse, negative = faster/better)
  run_avg_delta INTEGER NOT NULL DEFAULT 0,
  roxzone_delta INTEGER NOT NULL DEFAULT 0,
  ski_delta INTEGER NOT NULL DEFAULT 0,
  sled_push_delta INTEGER NOT NULL DEFAULT 0,
  sled_pull_delta INTEGER NOT NULL DEFAULT 0,
  bbj_delta INTEGER NOT NULL DEFAULT 0,
  row_delta INTEGER NOT NULL DEFAULT 0,
  farmers_delta INTEGER NOT NULL DEFAULT 0,
  sandbag_delta INTEGER NOT NULL DEFAULT 0,
  wallballs_delta INTEGER NOT NULL DEFAULT 0,
  
  version TEXT NOT NULL DEFAULT 'v1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT unique_delta UNIQUE (delta_type, delta_key, version)
);

-- 3) Overrides table: manual overrides for specific combinations
CREATE TABLE public.benchmark_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier TEXT NOT NULL CHECK (tier IN ('iniciante', 'intermediario', 'avancado', 'hyrox_open', 'hyrox_pro')),
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),
  age_group TEXT NOT NULL, -- e.g., '25-29', '30-34', etc.
  metric TEXT NOT NULL CHECK (metric IN ('run_avg', 'roxzone', 'ski', 'sled_push', 'sled_pull', 'bbj', 'row', 'farmers', 'sandbag', 'wallballs')),
  
  override_sec INTEGER NOT NULL CHECK (override_sec > 0),
  
  version TEXT NOT NULL DEFAULT 'v1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT unique_override UNIQUE (tier, gender, age_group, metric, version)
);

-- Enable RLS on all tables
ALTER TABLE public.benchmark_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_deltas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Read access for authenticated users
CREATE POLICY "Authenticated users can read benchmark_master"
  ON public.benchmark_master FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can read benchmark_deltas"
  ON public.benchmark_deltas FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can read benchmark_overrides"
  ON public.benchmark_overrides FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies: Admin write access (using admin_allowlist)
CREATE POLICY "Admins can manage benchmark_master"
  ON public.benchmark_master FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_allowlist
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_allowlist
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage benchmark_deltas"
  ON public.benchmark_deltas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_allowlist
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_allowlist
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage benchmark_overrides"
  ON public.benchmark_overrides FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_allowlist
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_allowlist
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Insert default master values (PRO Male - competitive times)
INSERT INTO public.benchmark_master (
  run_avg_sec, roxzone_sec, ski_sec, sled_push_sec, sled_pull_sec,
  bbj_sec, row_sec, farmers_sec, sandbag_sec, wallballs_sec
) VALUES (
  270,  -- 4:30 run avg
  60,   -- 1:00 roxzone
  210,  -- 3:30 ski
  90,   -- 1:30 sled push
  75,   -- 1:15 sled pull
  180,  -- 3:00 bbj
  210,  -- 3:30 row
  90,   -- 1:30 farmers
  150,  -- 2:30 sandbag
  120   -- 2:00 wallballs
);

-- Insert default tier deltas (seconds added to PRO Male base)
INSERT INTO public.benchmark_deltas (delta_type, delta_key, run_avg_delta, roxzone_delta, ski_delta, sled_push_delta, sled_pull_delta, bbj_delta, row_delta, farmers_delta, sandbag_delta, wallballs_delta) VALUES
  ('tier', 'hyrox_pro', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('tier', 'hyrox_open', 30, 15, 30, 15, 15, 30, 30, 15, 30, 20),
  ('tier', 'avancado', 60, 30, 60, 30, 30, 60, 60, 30, 60, 40),
  ('tier', 'intermediario', 120, 60, 120, 60, 60, 120, 120, 60, 120, 80),
  ('tier', 'iniciante', 180, 90, 180, 90, 90, 180, 180, 90, 180, 120);

-- Insert default gender deltas
INSERT INTO public.benchmark_deltas (delta_type, delta_key, run_avg_delta, roxzone_delta, ski_delta, sled_push_delta, sled_pull_delta, bbj_delta, row_delta, farmers_delta, sandbag_delta, wallballs_delta) VALUES
  ('gender', 'M', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('gender', 'F', 45, 15, 45, 20, 20, 45, 45, 20, 45, 30);

-- Insert default age group deltas (official HYROX brackets)
INSERT INTO public.benchmark_deltas (delta_type, delta_key, run_avg_delta, roxzone_delta, ski_delta, sled_push_delta, sled_pull_delta, bbj_delta, row_delta, farmers_delta, sandbag_delta, wallballs_delta) VALUES
  ('age_group', '16-24', -15, -5, -15, -5, -5, -15, -15, -5, -15, -10),
  ('age_group', '25-29', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('age_group', '30-34', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('age_group', '35-39', 15, 5, 15, 5, 5, 15, 15, 5, 15, 10),
  ('age_group', '40-44', 30, 10, 30, 10, 10, 30, 30, 10, 30, 20),
  ('age_group', '45-49', 45, 15, 45, 15, 15, 45, 45, 15, 45, 30),
  ('age_group', '50-54', 60, 20, 60, 20, 20, 60, 60, 20, 60, 40),
  ('age_group', '55-59', 90, 30, 90, 30, 30, 90, 90, 30, 90, 60),
  ('age_group', '60-64', 120, 40, 120, 40, 40, 120, 120, 40, 120, 80),
  ('age_group', '65-69', 150, 50, 150, 50, 50, 150, 150, 50, 150, 100),
  ('age_group', '70+', 180, 60, 180, 60, 60, 180, 180, 60, 180, 120);

-- Create function to get derived benchmark value
CREATE OR REPLACE FUNCTION public.get_benchmark_reference(
  p_tier TEXT,
  p_gender TEXT,
  p_age_group TEXT,
  p_metric TEXT,
  p_version TEXT DEFAULT 'v1'
)
RETURNS TABLE (
  ref_sec INTEGER,
  ref_source TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_override_sec INTEGER;
  v_master_sec INTEGER;
  v_tier_delta INTEGER;
  v_gender_delta INTEGER;
  v_age_delta INTEGER;
  v_metric_col TEXT;
BEGIN
  -- 1) Check for override first (highest priority)
  SELECT o.override_sec INTO v_override_sec
  FROM public.benchmark_overrides o
  WHERE o.tier = p_tier
    AND o.gender = p_gender
    AND o.age_group = p_age_group
    AND o.metric = p_metric
    AND o.version = p_version
    AND o.is_active = true;
  
  IF v_override_sec IS NOT NULL THEN
    RETURN QUERY SELECT v_override_sec, 'override'::TEXT;
    RETURN;
  END IF;
  
  -- 2) Calculate derived value from master + deltas
  -- Get master value for the metric
  v_metric_col := p_metric || '_sec';
  
  EXECUTE format(
    'SELECT %I FROM public.benchmark_master WHERE version = $1 AND is_active = true LIMIT 1',
    v_metric_col
  ) INTO v_master_sec USING p_version;
  
  IF v_master_sec IS NULL THEN
    RETURN QUERY SELECT NULL::INTEGER, 'not_found'::TEXT;
    RETURN;
  END IF;
  
  -- Get tier delta
  v_metric_col := p_metric || '_delta';
  EXECUTE format(
    'SELECT %I FROM public.benchmark_deltas WHERE delta_type = ''tier'' AND delta_key = $1 AND version = $2 AND is_active = true LIMIT 1',
    v_metric_col
  ) INTO v_tier_delta USING p_tier, p_version;
  v_tier_delta := COALESCE(v_tier_delta, 0);
  
  -- Get gender delta
  EXECUTE format(
    'SELECT %I FROM public.benchmark_deltas WHERE delta_type = ''gender'' AND delta_key = $1 AND version = $2 AND is_active = true LIMIT 1',
    v_metric_col
  ) INTO v_gender_delta USING p_gender, p_version;
  v_gender_delta := COALESCE(v_gender_delta, 0);
  
  -- Get age group delta
  EXECUTE format(
    'SELECT %I FROM public.benchmark_deltas WHERE delta_type = ''age_group'' AND delta_key = $1 AND version = $2 AND is_active = true LIMIT 1',
    v_metric_col
  ) INTO v_age_delta USING p_age_group, p_version;
  v_age_delta := COALESCE(v_age_delta, 0);
  
  -- Return derived value
  RETURN QUERY SELECT 
    (v_master_sec + v_tier_delta + v_gender_delta + v_age_delta)::INTEGER,
    'derived'::TEXT;
END;
$$;