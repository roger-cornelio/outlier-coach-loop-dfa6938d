DROP FUNCTION IF EXISTS public.submit_coach_application(text, text, text);

CREATE OR REPLACE FUNCTION public.submit_coach_application(_full_name text, _email text, _contact text)
 RETURNS TABLE(created boolean, approved boolean, application_id uuid, out_status text, out_created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  SELECT ca.id, ca.status, ca.created_at
  INTO v_existing
  FROM public.coach_applications ca
  WHERE ca.email_normalized = v_email
  ORDER BY ca.created_at DESC NULLS LAST
  LIMIT 1;

  IF FOUND THEN
    created := false;
    approved := (lower(btrim(v_existing.status)) IN ('approved','aprovado'));
    application_id := v_existing.id;
    out_status := v_existing.status;
    out_created_at := v_existing.created_at;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.coach_applications (full_name, email, instagram, status)
  VALUES (btrim(_full_name), v_email, btrim(_contact), 'pending')
  RETURNING id, coach_applications.status, coach_applications.created_at INTO v_inserted;

  created := true;
  approved := false;
  application_id := v_inserted.id;
  out_status := v_inserted.status;
  out_created_at := v_inserted.created_at;
  RETURN NEXT;
END;
$function$;