-- 1. Cleanup: Remove duplicate coach_applications, keeping only the most recent/strongest per email
-- Priority: approved > pending > rejected, then by created_at desc
WITH ranked AS (
  SELECT 
    id,
    email,
    status,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY lower(trim(email))
      ORDER BY 
        CASE status 
          WHEN 'approved' THEN 1 
          WHEN 'pending' THEN 2 
          WHEN 'rejected' THEN 3 
          ELSE 4 
        END,
        created_at DESC
    ) as rn
  FROM public.coach_applications
  WHERE email IS NOT NULL
),
to_delete AS (
  SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM public.coach_applications WHERE id IN (SELECT id FROM to_delete);

-- 2. Normalize all existing emails to lowercase
UPDATE public.coach_applications 
SET email = lower(trim(email))
WHERE email IS NOT NULL AND email != lower(trim(email));

-- 3. Create unique index on lowercase email (case-insensitive deduplication)
CREATE UNIQUE INDEX IF NOT EXISTS coach_applications_email_unique_idx 
ON public.coach_applications (lower(trim(email))) 
WHERE email IS NOT NULL;