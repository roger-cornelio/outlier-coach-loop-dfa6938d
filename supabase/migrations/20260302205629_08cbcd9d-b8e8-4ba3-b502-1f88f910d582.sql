
-- =============================================
-- BENCHMARKS ELITE PRO (base reference by age/sex)
-- =============================================
CREATE TABLE public.benchmarks_elite_pro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sex text NOT NULL CHECK (sex IN ('M', 'F')),
  age_min integer NOT NULL,
  age_max integer NOT NULL,
  elite_pro_seconds integer NOT NULL,
  version text NOT NULL DEFAULT 'v1',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE(sex, age_min, age_max, version)
);

ALTER TABLE public.benchmarks_elite_pro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active benchmarks_elite_pro"
ON public.benchmarks_elite_pro FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage benchmarks_elite_pro"
ON public.benchmarks_elite_pro FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Block anon benchmarks_elite_pro"
ON public.benchmarks_elite_pro FOR ALL TO anon USING (false);

-- Seed MEN
INSERT INTO public.benchmarks_elite_pro (sex, age_min, age_max, elite_pro_seconds) VALUES
('M',16,24,3840),('M',25,29,3900),('M',30,34,3960),('M',35,39,4020),('M',40,44,4140),
('M',45,49,4260),('M',50,54,4440),('M',55,59,4620),('M',60,64,4860),('M',65,99,5100);

-- Seed WOMEN
INSERT INTO public.benchmarks_elite_pro (sex, age_min, age_max, elite_pro_seconds) VALUES
('F',16,24,4320),('F',25,29,4380),('F',30,34,4440),('F',35,39,4560),('F',40,44,4680),
('F',45,49,4860),('F',50,54,5040),('F',55,59,5280),('F',60,64,5580),('F',65,99,5880);

-- =============================================
-- DIVISION FACTORS (multipliers per division)
-- =============================================
CREATE TABLE public.division_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division text NOT NULL,
  factor numeric(4,2) NOT NULL,
  version text NOT NULL DEFAULT 'v1',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE(division, version)
);

ALTER TABLE public.division_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active division_factors"
ON public.division_factors FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage division_factors"
ON public.division_factors FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Block anon division_factors"
ON public.division_factors FOR ALL TO anon USING (false);

-- Seed factors
INSERT INTO public.division_factors (division, factor) VALUES
('PRO', 1.00),
('OPEN', 1.03),
('DOUBLES', 0.94),
('RELAY', 0.85);
