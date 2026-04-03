-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for quick lookup
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, read, created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can see their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- System can insert notifications (via trigger/function)
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to notify coach when athlete submits feedback
CREATE OR REPLACE FUNCTION public.notify_coach_on_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _coach_user_id UUID;
  _athlete_name TEXT;
BEGIN
  -- Find the coach for this athlete
  SELECT ca.coach_id INTO _coach_user_id
  FROM public.coach_athletes ca
  WHERE ca.athlete_id = NEW.athlete_id
  LIMIT 1;

  IF _coach_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get athlete name
  SELECT COALESCE(p.name, split_part(p.email, '@', 1)) INTO _athlete_name
  FROM public.profiles p
  WHERE p.user_id = NEW.athlete_id
  LIMIT 1;

  -- Insert notification for coach
  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  VALUES (
    _coach_user_id,
    'feedback',
    'Novo feedback recebido',
    _athlete_name || ' enviou feedback do treino',
    jsonb_build_object('athlete_id', NEW.athlete_id, 'feedback_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

-- Trigger on workout_session_feedback
CREATE TRIGGER trg_notify_coach_on_feedback
  AFTER INSERT ON public.workout_session_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_coach_on_feedback();

-- Function to notify coach when athlete registers benchmark result
CREATE OR REPLACE FUNCTION public.notify_coach_on_benchmark()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _coach_user_id UUID;
  _athlete_name TEXT;
BEGIN
  -- Find the coach for this athlete
  SELECT ca.coach_id INTO _coach_user_id
  FROM public.coach_athletes ca
  WHERE ca.athlete_id = NEW.user_id
  LIMIT 1;

  IF _coach_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get athlete name
  SELECT COALESCE(p.name, split_part(p.email, '@', 1)) INTO _athlete_name
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id
  LIMIT 1;

  -- Insert notification for coach
  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  VALUES (
    _coach_user_id,
    'benchmark',
    'Novo resultado registrado',
    _athlete_name || ' registrou um resultado',
    jsonb_build_object('athlete_id', NEW.user_id, 'result_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

-- Trigger on benchmark_results
CREATE TRIGGER trg_notify_coach_on_benchmark
  AFTER INSERT ON public.benchmark_results
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_coach_on_benchmark();