-- =====================================================
-- FIX: Atualizar RPC get_coach_approval_by_email
-- Agora retorna: app_exists, approved, has_password, status
-- =====================================================

DROP FUNCTION IF EXISTS public.get_coach_approval_by_email(text);

CREATE FUNCTION public.get_coach_approval_by_email(_email text)
RETURNS TABLE(
  app_exists boolean,
  approved boolean,
  has_password boolean,
  status text,
  application_id uuid,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH app AS (
    SELECT 
      ca.id,
      ca.status,
      ca.created_at,
      ca.auth_user_id
    FROM public.coach_applications ca
    WHERE ca.email_normalized = lower(btrim(_email))
    ORDER BY ca.created_at DESC NULLS LAST
    LIMIT 1
  )
  SELECT
    (app.id IS NOT NULL) as app_exists,
    (lower(btrim(app.status)) IN ('approved','aprovado')) as approved,
    (app.auth_user_id IS NOT NULL) as has_password,
    COALESCE(app.status, 'none') as status,
    app.id as application_id,
    app.created_at
  FROM (SELECT 1) dummy
  LEFT JOIN app ON true;
$$;