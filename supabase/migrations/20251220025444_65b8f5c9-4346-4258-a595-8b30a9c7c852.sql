-- Create function to update timestamps (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create enum for workout status
CREATE TYPE workout_status AS ENUM ('draft', 'published', 'archived');

-- Create workouts table
CREATE TABLE public.workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  workout_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  price NUMERIC NOT NULL DEFAULT 0,
  status workout_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- Coaches can view their own workouts (any status)
CREATE POLICY "Coaches can view own workouts"
ON public.workouts
FOR SELECT
USING (auth.uid() = coach_id);

-- Coaches can insert their own workouts
CREATE POLICY "Coaches can insert own workouts"
ON public.workouts
FOR INSERT
WITH CHECK (auth.uid() = coach_id);

-- Coaches can update their own workouts
CREATE POLICY "Coaches can update own workouts"
ON public.workouts
FOR UPDATE
USING (auth.uid() = coach_id);

-- Coaches can delete their own workouts
CREATE POLICY "Coaches can delete own workouts"
ON public.workouts
FOR DELETE
USING (auth.uid() = coach_id);

-- Users (athletes) can only view published workouts with price = 0
CREATE POLICY "Users can view free published workouts"
ON public.workouts
FOR SELECT
USING (status = 'published' AND price = 0);

-- Admins can view all workouts
CREATE POLICY "Admins can view all workouts"
ON public.workouts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_workouts_updated_at
BEFORE UPDATE ON public.workouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for faster queries
CREATE INDEX idx_workouts_coach_id ON public.workouts(coach_id);
CREATE INDEX idx_workouts_status_price ON public.workouts(status, price) WHERE status = 'published' AND price = 0;