-- Add coach_style column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS coach_style text;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.coach_style IS 'Preferred coach style: IRON, PULSE, or SPARK';