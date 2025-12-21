-- =============================================
-- ATHLETE PLANS TABLE
-- Store published workout plans from coach to athlete
-- =============================================

-- Create athlete_plans table
CREATE TABLE public.athlete_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  plan_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  title text,
  status text NOT NULL DEFAULT 'published',
  published_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Unique constraint: one plan per athlete per week
  UNIQUE (athlete_user_id, week_start)
);

-- Create index on coach_id for faster lookups
CREATE INDEX idx_athlete_plans_coach_id ON public.athlete_plans(coach_id);
CREATE INDEX idx_athlete_plans_athlete_user_id ON public.athlete_plans(athlete_user_id);
CREATE INDEX idx_athlete_plans_week_start ON public.athlete_plans(week_start);

-- Enable RLS
ALTER TABLE public.athlete_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Athletes can view their own plans
CREATE POLICY "Athletes can view their own plans"
ON public.athlete_plans
FOR SELECT
USING (auth.uid() = athlete_user_id);

-- Coaches can view plans they created
CREATE POLICY "Coaches can view plans they created"
ON public.athlete_plans
FOR SELECT
USING (coach_id = public.get_profile_id(auth.uid()));

-- Coaches can insert plans for their linked athletes
CREATE POLICY "Coaches can insert plans for linked athletes"
ON public.athlete_plans
FOR INSERT
WITH CHECK (
  coach_id = public.get_profile_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = athlete_user_id
      AND p.coach_id = public.get_profile_id(auth.uid())
  )
);

-- Coaches can update plans they created
CREATE POLICY "Coaches can update their plans"
ON public.athlete_plans
FOR UPDATE
USING (coach_id = public.get_profile_id(auth.uid()));

-- Coaches can delete plans they created
CREATE POLICY "Coaches can delete their plans"
ON public.athlete_plans
FOR DELETE
USING (coach_id = public.get_profile_id(auth.uid()));

-- Admins can view all plans
CREATE POLICY "Admins can view all plans"
ON public.athlete_plans
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Add index on profiles.coach_id if not exists
CREATE INDEX IF NOT EXISTS idx_profiles_coach_id ON public.profiles(coach_id);

-- Add trigger for updated_at
CREATE TRIGGER update_athlete_plans_updated_at
BEFORE UPDATE ON public.athlete_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();