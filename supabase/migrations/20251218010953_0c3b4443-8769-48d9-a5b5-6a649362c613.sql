-- Create benchmark_results table to persist athlete benchmark history
CREATE TABLE public.benchmark_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  benchmark_id TEXT,
  completed BOOLEAN NOT NULL DEFAULT true,
  time_in_seconds INTEGER,
  score NUMERIC(5,2),
  bucket TEXT,
  athlete_level TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_benchmark_results_user_id ON public.benchmark_results(user_id);
CREATE INDEX idx_benchmark_results_benchmark_id ON public.benchmark_results(benchmark_id);
CREATE INDEX idx_benchmark_results_created_at ON public.benchmark_results(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.benchmark_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own benchmark results
CREATE POLICY "Users can view their own benchmark results"
ON public.benchmark_results
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own benchmark results"
ON public.benchmark_results
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own benchmark results"
ON public.benchmark_results
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own benchmark results"
ON public.benchmark_results
FOR DELETE
USING (auth.uid() = user_id);