
-- Table for level classification thresholds based on race results
CREATE TABLE public.level_time_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sex text NOT NULL CHECK (sex IN ('M', 'F')),
  division text NOT NULL CHECK (division IN ('INDIVIDUAL', 'DOUBLES', 'MIXED')),
  age_min integer NOT NULL,
  age_max integer NOT NULL,
  elite_seconds integer NOT NULL,
  elite_cap_seconds integer NOT NULL,
  pro_cap_seconds integer NOT NULL,
  version text NOT NULL DEFAULT 'v1',
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sex, division, age_min, age_max, version)
);

ALTER TABLE public.level_time_thresholds ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active thresholds
CREATE POLICY "Authenticated can read active thresholds"
ON public.level_time_thresholds FOR SELECT
TO authenticated
USING (is_active = true);

-- Admins full access
CREATE POLICY "Admins can manage thresholds"
ON public.level_time_thresholds FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Block anonymous
CREATE POLICY "Block anonymous access"
ON public.level_time_thresholds FOR ALL
TO anon
USING (false);

-- Seed MEN INDIVIDUAL
INSERT INTO public.level_time_thresholds (sex, division, age_min, age_max, elite_seconds, elite_cap_seconds, pro_cap_seconds) VALUES
('M','INDIVIDUAL',16,24,3840,4020,4380),
('M','INDIVIDUAL',25,29,3900,4080,4500),
('M','INDIVIDUAL',30,34,3960,4080,4560),
('M','INDIVIDUAL',35,39,4020,4200,4620),
('M','INDIVIDUAL',40,44,4140,4320,4800),
('M','INDIVIDUAL',45,49,4260,4440,4980),
('M','INDIVIDUAL',50,54,4440,4620,5160),
('M','INDIVIDUAL',55,59,4620,4860,5460),
('M','INDIVIDUAL',60,64,4860,5100,5820),
('M','INDIVIDUAL',65,99,5100,5340,6120);

-- Seed WOMEN INDIVIDUAL
INSERT INTO public.level_time_thresholds (sex, division, age_min, age_max, elite_seconds, elite_cap_seconds, pro_cap_seconds) VALUES
('F','INDIVIDUAL',16,24,4320,4560,4980),
('F','INDIVIDUAL',25,29,4380,4620,5100),
('F','INDIVIDUAL',30,34,4440,4680,5160),
('F','INDIVIDUAL',35,39,4560,4800,5340),
('F','INDIVIDUAL',40,44,4680,4980,5520),
('F','INDIVIDUAL',45,49,4860,5100,5760),
('F','INDIVIDUAL',50,54,5040,5340,6120),
('F','INDIVIDUAL',55,59,5280,5580,6600),
('F','INDIVIDUAL',60,64,5580,5880,7140),
('F','INDIVIDUAL',65,99,5880,6180,7560);

-- Seed MEN DOUBLES (-6% of individual elite)
INSERT INTO public.level_time_thresholds (sex, division, age_min, age_max, elite_seconds, elite_cap_seconds, pro_cap_seconds) VALUES
('M','DOUBLES',16,24,3610,3790,4120),
('M','DOUBLES',25,29,3666,3835,4230),
('M','DOUBLES',30,34,3722,3835,4286),
('M','DOUBLES',35,39,3779,3948,4343),
('M','DOUBLES',40,44,3892,4061,4512),
('M','DOUBLES',45,49,4004,4174,4681),
('M','DOUBLES',50,54,4174,4343,4850),
('M','DOUBLES',55,59,4343,4568,5132),
('M','DOUBLES',60,64,4568,4794,5471),
('M','DOUBLES',65,99,4794,5020,5753);

-- Seed WOMEN DOUBLES (-6%)
INSERT INTO public.level_time_thresholds (sex, division, age_min, age_max, elite_seconds, elite_cap_seconds, pro_cap_seconds) VALUES
('F','DOUBLES',16,24,4061,4286,4681),
('F','DOUBLES',25,29,4117,4343,4794),
('F','DOUBLES',30,34,4174,4399,4850),
('F','DOUBLES',35,39,4286,4512,5020),
('F','DOUBLES',40,44,4399,4681,5189),
('F','DOUBLES',45,49,4568,4794,5414),
('F','DOUBLES',50,54,4738,5020,5753),
('F','DOUBLES',55,59,4963,5245,6204),
('F','DOUBLES',60,64,5245,5527,6712),
('F','DOUBLES',65,99,5527,5809,7106);
