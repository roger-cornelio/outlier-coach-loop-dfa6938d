
-- Tabela de solicitações de vínculo atleta→coach
CREATE TABLE public.coach_link_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  athlete_name TEXT,
  athlete_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  UNIQUE(athlete_id, coach_id)
);

-- RLS
ALTER TABLE public.coach_link_requests ENABLE ROW LEVEL SECURITY;

-- Coach pode ver solicitações pendentes direcionadas a ele
CREATE POLICY "Coach can view own requests"
  ON public.coach_link_requests
  FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid() OR athlete_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Atleta pode inserir solicitação
CREATE POLICY "Athlete can insert request"
  ON public.coach_link_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

-- Coach pode atualizar (aprovar/rejeitar) suas solicitações
CREATE POLICY "Coach can update own requests"
  ON public.coach_link_requests
  FOR UPDATE
  TO authenticated
  USING (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Função para coach aprovar solicitação e criar vínculo
CREATE OR REPLACE FUNCTION public.approve_coach_link_request(_request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _req RECORD;
  _caller_id UUID := auth.uid();
  _coach_profile_id UUID;
BEGIN
  -- Buscar a solicitação
  SELECT * INTO _req FROM public.coach_link_requests WHERE id = _request_id;
  
  IF _req IS NULL THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;
  
  -- Verificar se o caller é o coach da solicitação ou admin
  IF _req.coach_id != _caller_id AND NOT public.has_role(_caller_id, 'admin') THEN
    RAISE EXCEPTION 'Apenas o coach pode aprovar esta solicitação';
  END IF;
  
  IF _req.status != 'pending' THEN
    RAISE EXCEPTION 'Solicitação já foi processada';
  END IF;
  
  -- Criar vínculo em coach_athletes
  INSERT INTO public.coach_athletes (coach_id, athlete_id)
  VALUES (_req.coach_id, _req.athlete_id)
  ON CONFLICT DO NOTHING;
  
  -- Atualizar profiles.coach_id (legacy field)
  SELECT id INTO _coach_profile_id FROM public.profiles WHERE user_id = _req.coach_id LIMIT 1;
  
  IF _coach_profile_id IS NOT NULL THEN
    UPDATE public.profiles SET coach_id = _coach_profile_id WHERE user_id = _req.athlete_id;
  END IF;
  
  -- Marcar solicitação como aprovada
  UPDATE public.coach_link_requests 
  SET status = 'approved', resolved_at = now() 
  WHERE id = _request_id;
  
  RETURN TRUE;
END;
$$;

-- Função para coach rejeitar solicitação
CREATE OR REPLACE FUNCTION public.reject_coach_link_request(_request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _req RECORD;
  _caller_id UUID := auth.uid();
BEGIN
  SELECT * INTO _req FROM public.coach_link_requests WHERE id = _request_id;
  
  IF _req IS NULL THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;
  
  IF _req.coach_id != _caller_id AND NOT public.has_role(_caller_id, 'admin') THEN
    RAISE EXCEPTION 'Apenas o coach pode rejeitar esta solicitação';
  END IF;
  
  UPDATE public.coach_link_requests 
  SET status = 'rejected', resolved_at = now() 
  WHERE id = _request_id;
  
  RETURN TRUE;
END;
$$;
