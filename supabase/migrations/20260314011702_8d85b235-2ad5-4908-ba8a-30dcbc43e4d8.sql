
-- Create intensity_rules table for PSE/Zone multipliers
CREATE TABLE IF NOT EXISTS public.intensity_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type text NOT NULL CHECK (rule_type IN ('pse', 'zone')),
  rule_key text NOT NULL,
  label text NOT NULL,
  tempo_multiplier numeric NOT NULL DEFAULT 1.0,
  kcal_multiplier numeric NOT NULL DEFAULT 1.0,
  rest_multiplier numeric NOT NULL DEFAULT 1.0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rule_type, rule_key)
);

-- Enable RLS
ALTER TABLE public.intensity_rules ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage intensity_rules"
  ON public.intensity_rules FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated can read active
CREATE POLICY "Authenticated can read intensity_rules"
  ON public.intensity_rules FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Block anon
CREATE POLICY "Block anon intensity_rules"
  ON public.intensity_rules FOR ALL
  TO anon
  USING (false);

-- Seed PSE rules (6-10)
INSERT INTO public.intensity_rules (rule_type, rule_key, label, tempo_multiplier, kcal_multiplier, rest_multiplier, description) VALUES
  ('pse', '6', 'PSE 6 - Moderado', 1.15, 0.85, 1.20, 'Esforço moderado, ritmo conversacional'),
  ('pse', '7', 'PSE 7 - Moderado-Alto', 1.05, 0.95, 1.10, 'Esforço moderado-alto, desconforto leve'),
  ('pse', '8', 'PSE 8 - Alto', 1.00, 1.00, 1.00, 'Esforço alto, referência padrão'),
  ('pse', '9', 'PSE 9 - Muito Alto', 0.95, 1.10, 0.90, 'Esforço muito alto, difícil manter'),
  ('pse', '10', 'PSE 10 - Máximo', 0.90, 1.20, 0.80, 'Esforço máximo, all-out');

-- Seed Zone rules (1-5)
INSERT INTO public.intensity_rules (rule_type, rule_key, label, tempo_multiplier, kcal_multiplier, rest_multiplier, description) VALUES
  ('zone', '1', 'Zona 1 - Recuperação', 1.30, 0.70, 1.50, 'Recuperação ativa, muito leve'),
  ('zone', '2', 'Zona 2 - Aeróbico Base', 1.15, 0.85, 1.20, 'Base aeróbica, conversacional'),
  ('zone', '3', 'Zona 3 - Tempo', 1.00, 1.00, 1.00, 'Limiar aeróbico, desconforto moderado'),
  ('zone', '4', 'Zona 4 - Limiar', 0.90, 1.15, 0.85, 'Limiar anaeróbico, difícil sustentar'),
  ('zone', '5', 'Zona 5 - VO2max', 0.80, 1.30, 0.70, 'Máximo, sprints curtos');
