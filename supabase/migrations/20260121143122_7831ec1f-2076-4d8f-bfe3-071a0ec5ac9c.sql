-- ================================================
-- TABELA 1 — status_level_rules
-- ================================================
CREATE TABLE public.status_level_rules (
  level_key TEXT PRIMARY KEY,
  level_order INTEGER NOT NULL,
  label TEXT NOT NULL,
  -- Constância
  training_min_sessions INTEGER NOT NULL DEFAULT 36,
  training_window_days INTEGER NOT NULL DEFAULT 90,
  -- Benchmarks OUTLIER
  benchmarks_required INTEGER NOT NULL DEFAULT 3,
  benchmarks_source TEXT NOT NULL DEFAULT 'ADMIN_DEFINED',
  -- Prova
  official_race_required BOOLEAN NOT NULL DEFAULT false,
  cap_without_official_race_percent INTEGER NOT NULL DEFAULT 89,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.status_level_rules ENABLE ROW LEVEL SECURITY;

-- RLS: Everyone can read
CREATE POLICY "Anyone can read status_level_rules"
  ON public.status_level_rules FOR SELECT
  USING (true);

-- RLS: Only admins can write
CREATE POLICY "Admins can insert status_level_rules"
  ON public.status_level_rules FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update status_level_rules"
  ON public.status_level_rules FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete status_level_rules"
  ON public.status_level_rules FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed default values
INSERT INTO public.status_level_rules (level_key, level_order, label, training_min_sessions, training_window_days, benchmarks_required, official_race_required, cap_without_official_race_percent) VALUES
  ('BEGINNER', 1, 'Iniciante', 36, 90, 3, false, 89),
  ('INTERMEDIATE', 2, 'Intermediário', 100, 180, 5, false, 89),
  ('ADVANCED', 3, 'Avançado', 200, 365, 10, false, 89),
  ('OPEN', 4, 'HYROX OPEN', 220, 365, 10, true, 89),
  ('PRO', 5, 'HYROX PRO', 250, 365, 12, true, 89),
  ('ELITE', 6, 'HYROX ELITE', 250, 365, 12, true, 89);

-- ================================================
-- TABELA 2 — status_jump_rules
-- ================================================
CREATE TABLE public.status_jump_rules (
  jump_key TEXT PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  race_category TEXT NOT NULL CHECK (race_category IN ('OPEN', 'PRO')),
  rank_scope TEXT NOT NULL DEFAULT 'AGE_GROUP',
  rank_top_n INTEGER NOT NULL,
  target_level TEXT NOT NULL REFERENCES public.status_level_rules(level_key),
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.status_jump_rules ENABLE ROW LEVEL SECURITY;

-- RLS: Everyone can read
CREATE POLICY "Anyone can read status_jump_rules"
  ON public.status_jump_rules FOR SELECT
  USING (true);

-- RLS: Only admins can write
CREATE POLICY "Admins can insert status_jump_rules"
  ON public.status_jump_rules FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update status_jump_rules"
  ON public.status_jump_rules FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete status_jump_rules"
  ON public.status_jump_rules FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed default values
INSERT INTO public.status_jump_rules (jump_key, is_enabled, race_category, rank_scope, rank_top_n, target_level) VALUES
  ('RACE_OPEN_TOP20_TO_OPEN', true, 'OPEN', 'AGE_GROUP', 20, 'OPEN'),
  ('RACE_PRO_TOP20_TO_PRO', true, 'PRO', 'AGE_GROUP', 20, 'PRO'),
  ('RACE_OPEN_TOP5_TO_PRO', true, 'OPEN', 'AGE_GROUP', 5, 'PRO'),
  ('RACE_PRO_TOP5_TO_ELITE', true, 'PRO', 'AGE_GROUP', 5, 'ELITE');

-- ================================================
-- TABELA 3 — status_config
-- ================================================
CREATE TABLE public.status_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  progress_model TEXT NOT NULL DEFAULT 'CHECKLIST',
  elite_requires_recency BOOLEAN NOT NULL DEFAULT true,
  elite_recency_days INTEGER NOT NULL DEFAULT 365,
  downgrade_elite_to_level TEXT NOT NULL DEFAULT 'PRO' REFERENCES public.status_level_rules(level_key),
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.status_config ENABLE ROW LEVEL SECURITY;

-- RLS: Everyone can read
CREATE POLICY "Anyone can read status_config"
  ON public.status_config FOR SELECT
  USING (true);

-- RLS: Only admins can write
CREATE POLICY "Admins can update status_config"
  ON public.status_config FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default config
INSERT INTO public.status_config (id, progress_model, elite_requires_recency, elite_recency_days, downgrade_elite_to_level) VALUES
  (1, 'CHECKLIST', true, 365, 'PRO');

-- ================================================
-- TRIGGERS for updated_at
-- ================================================
CREATE TRIGGER update_status_level_rules_updated_at
  BEFORE UPDATE ON public.status_level_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_status_jump_rules_updated_at
  BEFORE UPDATE ON public.status_jump_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_status_config_updated_at
  BEFORE UPDATE ON public.status_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();