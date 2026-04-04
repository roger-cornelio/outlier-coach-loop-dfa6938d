
-- Add new columns to diagnostic_leads
ALTER TABLE public.diagnostic_leads 
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS total_time_seconds integer,
  ADD COLUMN IF NOT EXISTS notified boolean NOT NULL DEFAULT false;

-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create trigger function to notify on new diagnostic lead
CREATE OR REPLACE FUNCTION public.notify_diagnostic_lead_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _webhook_url text;
  _supabase_url text;
  _anon_key text;
  _payload jsonb;
  _profile_name text;
  _profile_email text;
BEGIN
  -- Get the edge function URL from vault
  _supabase_url := current_setting('app.settings.supabase_url', true);
  
  -- Build payload with lead data
  SELECT COALESCE(p.name, split_part(p.email, '@', 1)), p.email
  INTO _profile_name, _profile_email
  FROM public.profiles p WHERE p.user_id = NEW.user_id LIMIT 1;

  _payload := jsonb_build_object(
    'lead_id', NEW.id,
    'lead_name', NEW.athlete_name_searched,
    'event', NEW.event_name,
    'division', NEW.division,
    'total_time_seconds', NEW.total_time_seconds,
    'telefone', NEW.telefone,
    'result_url', NEW.result_url,
    'profile_name', _profile_name,
    'profile_email', _profile_email,
    'created_at', NEW.created_at
  );

  -- Call the edge function via pg_net
  PERFORM extensions.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/notify-new-diagnostic-lead',
    body := _payload::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
    )::jsonb
  );

  -- Mark as notified
  NEW.notified := true;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the insert if notification fails
  RAISE WARNING 'Diagnostic lead webhook failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_notify_diagnostic_lead ON public.diagnostic_leads;
CREATE TRIGGER trg_notify_diagnostic_lead
  BEFORE INSERT ON public.diagnostic_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_diagnostic_lead_webhook();
