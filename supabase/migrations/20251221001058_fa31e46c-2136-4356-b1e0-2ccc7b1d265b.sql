-- Ensure coach applications cannot be duplicated by email (case/whitespace-insensitive)
-- This enforces the product rule: one application record per email.
CREATE UNIQUE INDEX IF NOT EXISTS coach_applications_email_unique
ON public.coach_applications (lower(trim(email)))
WHERE email IS NOT NULL;