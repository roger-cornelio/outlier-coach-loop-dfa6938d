-- Create coach_athletes table for linking coaches to their athletes
CREATE TABLE public.coach_athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  athlete_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (coach_id, athlete_id)
);

-- Enable RLS
ALTER TABLE public.coach_athletes ENABLE ROW LEVEL SECURITY;

-- Coaches can view their own athlete links
CREATE POLICY "Coaches can view their athlete links"
ON public.coach_athletes
FOR SELECT
USING (auth.uid() = coach_id);

-- Admins can view all links
CREATE POLICY "Admins can view all coach-athlete links"
ON public.coach_athletes
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert coach-athlete links
CREATE POLICY "Admins can insert coach-athlete links"
ON public.coach_athletes
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete coach-athlete links
CREATE POLICY "Admins can delete coach-athlete links"
ON public.coach_athletes
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));