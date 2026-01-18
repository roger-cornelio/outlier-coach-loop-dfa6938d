-- Create performance_level_benchmarks table
CREATE TABLE public.performance_level_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  division TEXT NOT NULL,
  gender TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('iniciante', 'intermediario', 'avancado', 'pro')),
  metric TEXT NOT NULL CHECK (metric IN ('run_avg', 'roxzone', 'ski', 'sled_push', 'sled_pull', 'bbj', 'row', 'farmers', 'sandbag', 'wallballs')),
  avg_sec INTEGER NOT NULL CHECK (avg_sec > 0),
  p25_sec INTEGER CHECK (p25_sec IS NULL OR p25_sec > 0),
  p75_sec INTEGER CHECK (p75_sec IS NULL OR p75_sec > 0),
  benchmark_set_id TEXT NOT NULL DEFAULT 'v1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by TEXT,
  CONSTRAINT unique_benchmark UNIQUE (division, gender, level, metric, benchmark_set_id),
  CONSTRAINT p25_less_than_avg CHECK (p25_sec IS NULL OR p25_sec <= avg_sec),
  CONSTRAINT avg_less_than_p75 CHECK (p75_sec IS NULL OR avg_sec <= p75_sec)
);

-- Enable RLS
ALTER TABLE public.performance_level_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_level_benchmarks FORCE ROW LEVEL SECURITY;

-- Block anonymous access
CREATE POLICY "Block anonymous access"
ON public.performance_level_benchmarks
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Authenticated users can read active benchmarks
CREATE POLICY "Authenticated can read active benchmarks"
ON public.performance_level_benchmarks
FOR SELECT
TO authenticated
USING (is_active = true);

-- Admins can read all benchmarks (correct has_role signature: user_id first, role second)
CREATE POLICY "Admins can read all benchmarks"
ON public.performance_level_benchmarks
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Admins can insert benchmarks
CREATE POLICY "Admins can insert benchmarks"
ON public.performance_level_benchmarks
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Admins can update benchmarks (soft delete via is_active=false)
CREATE POLICY "Admins can update benchmarks"
ON public.performance_level_benchmarks
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Block physical DELETE (use is_active=false instead)
CREATE POLICY "Block physical delete"
ON public.performance_level_benchmarks
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

-- Trigger for updated_at
CREATE TRIGGER update_performance_level_benchmarks_updated_at
BEFORE UPDATE ON public.performance_level_benchmarks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial mock data for HYROX PRO Female (all levels)
-- Iniciante level (slower times)
INSERT INTO public.performance_level_benchmarks (division, gender, level, metric, avg_sec, p25_sec, p75_sec) VALUES
('HYROX PRO', 'F', 'iniciante', 'run_avg', 420, 390, 480),
('HYROX PRO', 'F', 'iniciante', 'roxzone', 150, 135, 180),
('HYROX PRO', 'F', 'iniciante', 'ski', 300, 270, 360),
('HYROX PRO', 'F', 'iniciante', 'sled_push', 180, 150, 210),
('HYROX PRO', 'F', 'iniciante', 'sled_pull', 180, 150, 210),
('HYROX PRO', 'F', 'iniciante', 'bbj', 240, 210, 300),
('HYROX PRO', 'F', 'iniciante', 'row', 210, 180, 240),
('HYROX PRO', 'F', 'iniciante', 'farmers', 150, 120, 180),
('HYROX PRO', 'F', 'iniciante', 'sandbag', 180, 150, 210),
('HYROX PRO', 'F', 'iniciante', 'wallballs', 240, 210, 300);

-- Intermediario level
INSERT INTO public.performance_level_benchmarks (division, gender, level, metric, avg_sec, p25_sec, p75_sec) VALUES
('HYROX PRO', 'F', 'intermediario', 'run_avg', 360, 330, 390),
('HYROX PRO', 'F', 'intermediario', 'roxzone', 120, 105, 150),
('HYROX PRO', 'F', 'intermediario', 'ski', 240, 210, 270),
('HYROX PRO', 'F', 'intermediario', 'sled_push', 135, 120, 165),
('HYROX PRO', 'F', 'intermediario', 'sled_pull', 135, 120, 165),
('HYROX PRO', 'F', 'intermediario', 'bbj', 180, 150, 210),
('HYROX PRO', 'F', 'intermediario', 'row', 165, 150, 195),
('HYROX PRO', 'F', 'intermediario', 'farmers', 120, 100, 150),
('HYROX PRO', 'F', 'intermediario', 'sandbag', 135, 120, 165),
('HYROX PRO', 'F', 'intermediario', 'wallballs', 180, 150, 210);

-- Avancado level
INSERT INTO public.performance_level_benchmarks (division, gender, level, metric, avg_sec, p25_sec, p75_sec) VALUES
('HYROX PRO', 'F', 'avancado', 'run_avg', 300, 270, 330),
('HYROX PRO', 'F', 'avancado', 'roxzone', 90, 75, 105),
('HYROX PRO', 'F', 'avancado', 'ski', 195, 180, 225),
('HYROX PRO', 'F', 'avancado', 'sled_push', 105, 90, 120),
('HYROX PRO', 'F', 'avancado', 'sled_pull', 105, 90, 120),
('HYROX PRO', 'F', 'avancado', 'bbj', 135, 120, 165),
('HYROX PRO', 'F', 'avancado', 'row', 135, 120, 150),
('HYROX PRO', 'F', 'avancado', 'farmers', 90, 75, 105),
('HYROX PRO', 'F', 'avancado', 'sandbag', 105, 90, 120),
('HYROX PRO', 'F', 'avancado', 'wallballs', 135, 120, 165);

-- Pro level (fastest times)
INSERT INTO public.performance_level_benchmarks (division, gender, level, metric, avg_sec, p25_sec, p75_sec) VALUES
('HYROX PRO', 'F', 'pro', 'run_avg', 255, 240, 270),
('HYROX PRO', 'F', 'pro', 'roxzone', 60, 50, 75),
('HYROX PRO', 'F', 'pro', 'ski', 165, 150, 180),
('HYROX PRO', 'F', 'pro', 'sled_push', 75, 60, 90),
('HYROX PRO', 'F', 'pro', 'sled_pull', 75, 60, 90),
('HYROX PRO', 'F', 'pro', 'bbj', 105, 90, 120),
('HYROX PRO', 'F', 'pro', 'row', 105, 90, 120),
('HYROX PRO', 'F', 'pro', 'farmers', 60, 50, 75),
('HYROX PRO', 'F', 'pro', 'sandbag', 75, 60, 90),
('HYROX PRO', 'F', 'pro', 'wallballs', 105, 90, 120);