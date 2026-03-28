-- Add password_set column
ALTER TABLE public.coach_applications ADD COLUMN password_set boolean DEFAULT false;

-- Update RPC to use password_set instead of auth_user_id IS NOT NULL
CREATE OR REPLACE FUNCTION public.get_coach_approval_by_email(_email text)
 RETURNS TABLE(app_exists boolean, approved boolean, has_password boolean, status text, application_id uuid, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH app AS (
    SELECT 
      ca.id,
      ca.status,
      ca.created_at,
      ca.auth_user_id,
      ca.password_set
    FROM public.coach_applications ca
    WHERE ca.email_normalized = lower(btrim(_email))
    ORDER BY ca.created_at DESC NULLS LAST
    LIMIT 1
  )
  SELECT
    (app.id IS NOT NULL) as app_exists,
    (lower(btrim(app.status)) IN ('approved','aprovado')) as approved,
    COALESCE(app.password_set, false) as has_password,
    COALESCE(app.status, 'none') as status,
    app.id as application_id,
    app.created_at
  FROM (SELECT 1) dummy
  LEFT JOIN app ON true;
$function$;