-- Create percentile_bands table for OUTLIER scoring model
CREATE TABLE public.percentile_bands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Classification dimensions
  division TEXT NOT NULL,
  gender TEXT NOT NULL,
  metric TEXT NOT NULL CHECK (metric IN ('run_avg', 'roxzone', 'ski', 'sled_push', 'sled_pull', 'bbj', 'row', 'farmers', 'sandbag', 'wallballs')),
  
  -- Percentile thresholds (all in seconds)
  p10_sec INTEGER NOT NULL,
  p25_sec INTEGER NOT NULL,
  p50_sec INTEGER NOT NULL,
  p75_sec INTEGER NOT NULL,
  p90_sec INTEGER NOT NULL,
  
  -- Versioning (B-READY for future models)
  percentile_set_id TEXT NOT NULL DEFAULT 'v1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Audit fields
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by TEXT,
  
  -- Validation: percentiles must be strictly ascending
  CONSTRAINT percentile_order_check CHECK (p10_sec < p25_sec AND p25_sec < p50_sec AND p50_sec < p75_sec AND p75_sec < p90_sec),
  
  -- Unique constraint per division/gender/metric/version combination
  CONSTRAINT unique_band_per_version UNIQUE (division, gender, metric, percentile_set_id)
);

-- Add table comment for documentation
COMMENT ON TABLE public.percentile_bands IS 'Percentile bands for OUTLIER scoring model. Values in seconds. Use is_active=false instead of DELETE.';

-- Enable RLS
ALTER TABLE public.percentile_bands ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner
ALTER TABLE public.percentile_bands FORCE ROW LEVEL SECURITY;

-- Block anonymous access
CREATE POLICY "Block anonymous SELECT on percentile_bands"
  ON public.percentile_bands
  AS RESTRICTIVE
  FOR SELECT
  TO anon
  USING (false);

-- Allow authenticated users to read active bands
CREATE POLICY "Authenticated users can read active percentile_bands"
  ON public.percentile_bands
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Allow admins/superadmins full read access (including inactive)
CREATE POLICY "Admins can read all percentile_bands"
  ON public.percentile_bands
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
    )
  );

-- Only admins/superadmins can insert
CREATE POLICY "Admins can insert percentile_bands"
  ON public.percentile_bands
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
    )
  );

-- Only admins/superadmins can update
CREATE POLICY "Admins can update percentile_bands"
  ON public.percentile_bands
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
    )
  );

-- BLOCK all DELETE operations (use is_active=false instead)
CREATE POLICY "Block DELETE on percentile_bands"
  ON public.percentile_bands
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);