-- Add individual metric time columns to benchmark_results for HYROX splits
-- These columns allow storing REAL times per station/segment when available

ALTER TABLE public.benchmark_results
ADD COLUMN IF NOT EXISTS run_avg_sec integer,
ADD COLUMN IF NOT EXISTS roxzone_sec integer,
ADD COLUMN IF NOT EXISTS ski_sec integer,
ADD COLUMN IF NOT EXISTS sled_push_sec integer,
ADD COLUMN IF NOT EXISTS sled_pull_sec integer,
ADD COLUMN IF NOT EXISTS bbj_sec integer,
ADD COLUMN IF NOT EXISTS row_sec integer,
ADD COLUMN IF NOT EXISTS farmers_sec integer,
ADD COLUMN IF NOT EXISTS sandbag_sec integer,
ADD COLUMN IF NOT EXISTS wallballs_sec integer;

-- Add comment explaining usage
COMMENT ON COLUMN public.benchmark_results.run_avg_sec IS 'Average running segment time in seconds (REAL data from race)';
COMMENT ON COLUMN public.benchmark_results.roxzone_sec IS 'Total Roxzone (transition) time in seconds (REAL data from race)';
COMMENT ON COLUMN public.benchmark_results.ski_sec IS 'Ski Erg station time in seconds (REAL data from race)';
COMMENT ON COLUMN public.benchmark_results.sled_push_sec IS 'Sled Push station time in seconds (REAL data from race)';
COMMENT ON COLUMN public.benchmark_results.sled_pull_sec IS 'Sled Pull station time in seconds (REAL data from race)';
COMMENT ON COLUMN public.benchmark_results.bbj_sec IS 'Burpee Broad Jump station time in seconds (REAL data from race)';
COMMENT ON COLUMN public.benchmark_results.row_sec IS 'Rowing station time in seconds (REAL data from race)';
COMMENT ON COLUMN public.benchmark_results.farmers_sec IS 'Farmers Carry station time in seconds (REAL data from race)';
COMMENT ON COLUMN public.benchmark_results.sandbag_sec IS 'Sandbag Lunges station time in seconds (REAL data from race)';
COMMENT ON COLUMN public.benchmark_results.wallballs_sec IS 'Wall Balls station time in seconds (REAL data from race)';