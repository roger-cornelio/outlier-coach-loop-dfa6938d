
ALTER TABLE public.profiles ADD COLUMN telefone text;

-- Trigger to auto-insert into crm_clientes when profile is created with telefone
CREATE OR REPLACE FUNCTION public.sync_profile_to_crm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.telefone IS NOT NULL AND NEW.telefone <> '' THEN
    INSERT INTO public.crm_clientes (nome, telefone)
    VALUES (COALESCE(NEW.name, NEW.email), NEW.telefone)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_profile_to_crm
  AFTER INSERT OR UPDATE OF telefone ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_crm();
