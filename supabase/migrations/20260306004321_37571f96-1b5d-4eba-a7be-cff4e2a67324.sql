
-- 1. Table: discovered_events — Central registry of all events (validated or pending)
CREATE TABLE public.discovered_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text,
  tipo_evento text NOT NULL DEFAULT 'OFICIAL', -- OFICIAL | PARALELA | SIMULADO
  data_evento date,
  cidade text,
  estado text,
  pais text DEFAULT 'BR',
  venue text,
  organizador text,
  origem_principal text, -- HYROX | SYMPLA | SITE_ORGANIZADOR | BUSCA_EXTERNA | MANUAL
  url_origem text,
  url_inscricao text,
  url_resultado text,
  status_validacao text NOT NULL DEFAULT 'AGUARDANDO_AUTORIZACAO_ADMIN', -- VALIDADA | AGUARDANDO_AUTORIZACAO_ADMIN | REJEITADA | RASCUNHO | DUPLICADA
  grau_confianca integer NOT NULL DEFAULT 0, -- 0-100
  possivel_duplicata boolean NOT NULL DEFAULT false,
  duplicata_de uuid REFERENCES public.discovered_events(id),
  categoria_hyrox text, -- HYROX | HYROX_PRO | HYROX_DOUBLES etc
  created_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Table: event_discovery_logs — Raw search/discovery data for admin trail
CREATE TABLE public.event_discovery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.discovered_events(id) ON DELETE SET NULL,
  termo_busca text,
  origem text, -- HYROX | SYMPLA | BUSCA_EXTERNA | MANUAL
  raw_title text,
  raw_text text,
  raw_url text,
  cidade_detectada text,
  estado_detectado text,
  data_detectada date,
  score integer NOT NULL DEFAULT 0,
  motivo_pendencia text[], -- array of reasons: 'sem_data', 'sem_cidade', 'sem_estado', 'sem_fonte', 'dados_conflitantes'
  requested_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Table: event_review_queue — Admin review queue with search suggestions
CREATE TABLE public.event_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.discovered_events(id) ON DELETE CASCADE,
  discovery_log_id uuid REFERENCES public.event_discovery_logs(id) ON DELETE SET NULL,
  status_fila text NOT NULL DEFAULT 'PENDENTE', -- PENDENTE | EM_ANALISE | RESOLVIDO
  motivo text,
  sugestoes_busca_json jsonb DEFAULT '[]'::jsonb,
  admin_notes text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for discovered_events
ALTER TABLE public.discovered_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anon discovered_events" ON public.discovered_events
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "Authenticated can read validated events" ON public.discovered_events
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (status_validacao = 'VALIDADA');

CREATE POLICY "Admins can manage all events" ON public.discovered_events
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can insert events" ON public.discovered_events
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS for event_discovery_logs
ALTER TABLE public.event_discovery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anon event_discovery_logs" ON public.event_discovery_logs
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "Admins can manage discovery logs" ON public.event_discovery_logs
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can insert discovery logs" ON public.event_discovery_logs
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own discovery logs" ON public.event_discovery_logs
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (requested_by = auth.uid());

-- RLS for event_review_queue
ALTER TABLE public.event_review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anon event_review_queue" ON public.event_review_queue
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "Admins can manage review queue" ON public.event_review_queue
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Indexes
CREATE INDEX idx_discovered_events_status ON public.discovered_events(status_validacao);
CREATE INDEX idx_discovered_events_data ON public.discovered_events(data_evento);
CREATE INDEX idx_discovered_events_cidade ON public.discovered_events(cidade);
CREATE INDEX idx_event_review_queue_status ON public.event_review_queue(status_fila);

-- Seed some mock validated events for testing
INSERT INTO public.discovered_events (nome, tipo_evento, data_evento, cidade, estado, organizador, origem_principal, url_origem, url_inscricao, status_validacao, grau_confianca, categoria_hyrox) VALUES
('HYROX São Paulo 2026', 'OFICIAL', '2026-06-14', 'São Paulo', 'SP', 'HYROX GmbH', 'HYROX', 'https://hyrox.com/races/sao-paulo', 'https://hyrox.com/races/sao-paulo/register', 'VALIDADA', 95, 'HYROX'),
('HYROX Rio de Janeiro 2026', 'OFICIAL', '2026-09-20', 'Rio de Janeiro', 'RJ', 'HYROX GmbH', 'HYROX', 'https://hyrox.com/races/rio-de-janeiro', 'https://hyrox.com/races/rio-de-janeiro/register', 'VALIDADA', 95, 'HYROX'),
('HYROX Brasília 2026', 'OFICIAL', '2026-11-08', 'Brasília', 'DF', 'HYROX GmbH', 'HYROX', 'https://hyrox.com/races/brasilia', 'https://hyrox.com/races/brasilia/register', 'VALIDADA', 95, 'HYROX'),
('Simulado HYROX CrossBox SP', 'SIMULADO', '2026-05-10', 'São Paulo', 'SP', 'CrossBox Academy', 'MANUAL', NULL, NULL, 'VALIDADA', 75, 'HYROX'),
('Fitness Race Curitiba', 'PARALELA', '2026-07-26', 'Curitiba', 'PR', 'FR Events', 'SYMPLA', 'https://sympla.com.br/fitness-race-cwb', 'https://sympla.com.br/fitness-race-cwb', 'VALIDADA', 80, NULL),
('Hybrid Race BH', 'PARALELA', '2026-08-15', 'Belo Horizonte', 'MG', 'Hybrid Sports', 'BUSCA_EXTERNA', 'https://hybridrace.com.br', NULL, 'AGUARDANDO_AUTORIZACAO_ADMIN', 55, NULL),
('Simulado HYROX Arena Fit', 'SIMULADO', '2026-04-20', 'Campinas', 'SP', NULL, 'MANUAL', NULL, NULL, 'AGUARDANDO_AUTORIZACAO_ADMIN', 40, 'HYROX');
