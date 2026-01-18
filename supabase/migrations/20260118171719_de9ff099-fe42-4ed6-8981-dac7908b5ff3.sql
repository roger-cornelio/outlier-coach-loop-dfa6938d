-- Add data_source column to track metric origin (real vs estimated)
ALTER TABLE public.hyrox_metric_scores 
ADD COLUMN IF NOT EXISTS data_source text NOT NULL DEFAULT 'estimated';

-- Add a comment for documentation
COMMENT ON COLUMN public.hyrox_metric_scores.data_source IS 'Origin of the metric data: "real" (provided by athlete) or "estimated" (inferred from total time)';

-- Add a CHECK constraint to ensure valid values
ALTER TABLE public.hyrox_metric_scores 
ADD CONSTRAINT hyrox_metric_scores_data_source_check 
CHECK (data_source IN ('real', 'estimated'));