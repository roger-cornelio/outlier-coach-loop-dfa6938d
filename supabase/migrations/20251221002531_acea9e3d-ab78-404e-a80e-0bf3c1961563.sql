-- Coach applications: normalize email, deduplicate, enforce uniqueness, and expose minimal RPCs

BEGIN;

-- 1) Normalized email (stored) + updated_at
ALTER TABLE public.coach_applications
  ADD COLUMN IF NOT EXISTS email_normalized text GENERATED ALWAYS AS (lower(btrim(email))) STORED;

ALTER TABLE public.coach_applications
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill updated_at for existing rows
UPDATE public.coach_applications
SET updated_at = COALESCE(reviewed_at, created_at, now())
WHERE updated_at IS NULL;

-- 2) Deduplicate by email_normalized (keep best candidate)
WITH ranked AS (
  SELECT
    id,
    email_normalized,
    ROW_NUMBER() OVER (
      PARTITION BY email_normalized
      ORDER BY
        CASE
          WHEN lower(btrim(status)) IN ('approved', 'aprovado') THEN 0
          WHEN lower(btrim(status)) = 'pending' THEN 1
          WHEN lower(btrim(status)) = 'rejected' THEN 2
          ELSE 3
        END,
        created_at DESC NULLS LAST
    ) AS rn
  FROM public.coach_applications
  WHERE email_normalized IS NOT NULL
)
DELETE FROM public.coach_applications ca
USING ranked r
WHERE ca.id = r.id
  AND r.rn > 1;

-- 3) Enforce uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS coach_applications_email_normalized_key
  ON public.coach_applications (email_normalized);

-- 4) updated_at trigger
DROP TRIGGER IF EXISTS update_coach_applications_updated_at ON public.coach_applications;
CREATE TRIGGER update_coach_applications_updated_at
BEFORE UPDATE ON public.coach_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5) RPC: get coach approval by email (bypasses RLS but returns minimal fields)
CREATE OR REPLACE FUNCTION public.get_coach_approval_by_email(_email text)
RETURNS TABLE (
  approved boolean,
  application_id uuid,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  WITH q AS (
    SELECT id, status, created_at
    FROM public.coach_applications
    WHERE email_normalized = lower(btrim(_email))
    ORDER BY created_at DESC NULLS LAST
    LIMIT 1
  )
  SELECT
    (lower(btrim(q.status)) IN ('approved','aprovado')) as approved,
    q.id as application_id,
    q.status,
    q.created_at
  FROM q;
$$;

GRANT EXECUTE ON FUNCTION public.get_coach_approval_by_email(text) TO anon, authenticated;

-- 6) RPC: submit coach application (no duplicates; returns existing status)
CREATE OR REPLACE FUNCTION public.submit_coach_application(
  _full_name text,
  _email text,
  _contact text
)
RETURNS TABLE (
  created boolean,
  approved boolean,
  application_id uuid,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_email text;
  v_existing record;
  v_inserted record;
BEGIN
  v_email := lower(btrim(_email));

  IF v_email IS NULL OR v_email = '' OR position('@' in v_email) = 0 THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;

  IF length(v_email) > 255 THEN
    RAISE EXCEPTION 'email_too_long';
  END IF;

  IF _full_name IS NULL OR btrim(_full_name) = '' OR length(btrim(_full_name)) > 100 THEN
    RAISE EXCEPTION 'invalid_full_name';
  END IF;

  IF _contact IS NULL OR btrim(_contact) = '' OR length(btrim(_contact)) > 100 THEN
    RAISE EXCEPTION 'invalid_contact';
  END IF;

  SELECT id, status, created_at
  INTO v_existing
  FROM public.coach_applications
  WHERE email_normalized = v_email
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1;

  IF FOUND THEN
    created := false;
    approved := (lower(btrim(v_existing.status)) IN ('approved','aprovado'));
    application_id := v_existing.id;
    status := v_existing.status;
    created_at := v_existing.created_at;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.coach_applications (full_name, email, instagram, status)
  VALUES (btrim(_full_name), v_email, btrim(_contact), 'pending')
  RETURNING id, status, created_at INTO v_inserted;

  created := true;
  approved := false;
  application_id := v_inserted.id;
  status := v_inserted.status;
  created_at := v_inserted.created_at;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_coach_application(text, text, text) TO anon, authenticated;

COMMIT;