-- Create hyrox_metric_scores table for immutable performance snapshots (MODEL A)
CREATE TABLE public.hyrox_metric_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hyrox_result_id UUID NOT NULL,
  metric TEXT NOT NULL,
  raw_time_sec INTEGER NOT NULL,
  percentile_value INTEGER NOT NULL CHECK (percentile_value >= 1 AND percentile_value <= 99),
  percentile_set_id_used TEXT NOT NULL DEFAULT 'v1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for common queries
CREATE INDEX idx_hyrox_metric_scores_result_id ON public.hyrox_metric_scores(hyrox_result_id);
CREATE INDEX idx_hyrox_metric_scores_metric ON public.hyrox_metric_scores(metric);

-- Enable RLS
ALTER TABLE public.hyrox_metric_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hyrox_metric_scores FORCE ROW LEVEL SECURITY;

-- Block anonymous access
CREATE POLICY "Block anonymous access to hyrox_metric_scores"
  ON public.hyrox_metric_scores
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);

-- Allow authenticated users to INSERT only (immutable - no update/delete)
CREATE POLICY "Authenticated users can insert hyrox_metric_scores"
  ON public.hyrox_metric_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to SELECT their own results
-- (assumes hyrox_results has user_id linkage - adjust if needed)
CREATE POLICY "Authenticated users can view hyrox_metric_scores"
  ON public.hyrox_metric_scores
  FOR SELECT
  TO authenticated
  USING (true);

-- CRITICAL: Block ALL updates - immutable data
CREATE POLICY "Block all updates to hyrox_metric_scores"
  ON public.hyrox_metric_scores
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- CRITICAL: Block ALL deletes - immutable data
CREATE POLICY "Block all deletes from hyrox_metric_scores"
  ON public.hyrox_metric_scores
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

-- Add table comment for documentation
COMMENT ON TABLE public.hyrox_metric_scores IS 'Immutable snapshots of performance analysis. Percentiles calculated ONCE at creation, never recalculated. MODEL A - no updates/deletes allowed.';