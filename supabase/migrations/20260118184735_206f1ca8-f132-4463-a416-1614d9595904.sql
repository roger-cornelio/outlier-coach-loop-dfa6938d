-- Step 1: Drop the old CHECK constraint
ALTER TABLE public.performance_level_benchmarks 
DROP CONSTRAINT IF EXISTS performance_level_benchmarks_level_check;

-- Step 2: Update existing 'pro' records to 'hyrox_pro'
UPDATE public.performance_level_benchmarks 
SET level = 'hyrox_pro' 
WHERE level = 'pro';

-- Step 3: Add new CHECK constraint with all 5 journey levels
ALTER TABLE public.performance_level_benchmarks 
ADD CONSTRAINT performance_level_benchmarks_level_check 
CHECK (level IN ('iniciante', 'intermediario', 'avancado', 'hyrox_open', 'hyrox_pro'));