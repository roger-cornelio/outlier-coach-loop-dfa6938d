-- Trigger: notify coach when athlete requests link
CREATE OR REPLACE FUNCTION public.notify_coach_on_link_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  VALUES (
    NEW.coach_id,
    'link_request',
    'Novo atleta quer treinar com você',
    COALESCE(NEW.athlete_name, NEW.athlete_email, 'Um atleta') || ' solicitou vínculo.',
    jsonb_build_object('request_id', NEW.id, 'athlete_id', NEW.athlete_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_coach_on_link_request
  AFTER INSERT ON public.coach_link_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_coach_on_link_request();

-- Trigger: notify athlete when coach approves link
CREATE OR REPLACE FUNCTION public.notify_athlete_on_link_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    INSERT INTO public.notifications (user_id, type, title, body, metadata)
    VALUES (
      NEW.athlete_id,
      'link_approved',
      'Seu coach aceitou você! 🎉',
      'Você já está vinculado ao seu treinador. Em breve receberá seu primeiro treino.',
      jsonb_build_object('coach_id', NEW.coach_id, 'request_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_athlete_on_link_approved
  AFTER UPDATE OF status ON public.coach_link_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_athlete_on_link_approved();