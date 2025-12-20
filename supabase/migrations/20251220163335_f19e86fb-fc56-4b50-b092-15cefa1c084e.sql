-- Add first_setup_completed flag to profiles
ALTER TABLE public.profiles 
ADD COLUMN first_setup_completed boolean NOT NULL DEFAULT false;

-- Update existing users who already have coach_style to mark as setup completed
UPDATE public.profiles 
SET first_setup_completed = true 
WHERE coach_style IS NOT NULL;