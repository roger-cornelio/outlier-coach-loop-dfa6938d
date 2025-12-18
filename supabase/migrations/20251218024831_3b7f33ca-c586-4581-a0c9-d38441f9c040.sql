-- Add race_category column to track if race was OPEN or PRO
ALTER TABLE public.benchmark_results 
ADD COLUMN race_category TEXT CHECK (race_category IN ('OPEN', 'PRO'));