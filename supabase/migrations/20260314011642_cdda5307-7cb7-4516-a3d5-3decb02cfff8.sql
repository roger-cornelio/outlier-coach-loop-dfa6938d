
-- Add slug and aliases to movement_patterns
ALTER TABLE public.movement_patterns
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}';

-- Add slug and aliases to global_exercises
ALTER TABLE public.global_exercises
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}';

-- Create index on aliases for GIN search
CREATE INDEX IF NOT EXISTS idx_movement_patterns_aliases ON public.movement_patterns USING GIN (aliases);
CREATE INDEX IF NOT EXISTS idx_global_exercises_aliases ON public.global_exercises USING GIN (aliases);
CREATE INDEX IF NOT EXISTS idx_movement_patterns_slug ON public.movement_patterns (slug);
CREATE INDEX IF NOT EXISTS idx_global_exercises_slug ON public.global_exercises (slug);
