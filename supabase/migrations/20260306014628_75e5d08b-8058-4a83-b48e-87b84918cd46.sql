
-- 1. Create formula_type enum
CREATE TYPE public.formula_type AS ENUM ('vertical_work', 'horizontal_friction', 'metabolic');

-- 2. Table A: movement_patterns (The Physics Brain)
CREATE TABLE public.movement_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  formula_type formula_type NOT NULL DEFAULT 'vertical_work',
  moved_mass_percentage numeric NOT NULL DEFAULT 0.70,
  default_distance_meters numeric NOT NULL DEFAULT 0.5,
  friction_coefficient numeric,
  human_efficiency_rate numeric NOT NULL DEFAULT 0.20,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Table B: global_exercises (Master Library)
CREATE TABLE public.global_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  movement_pattern_id uuid NOT NULL REFERENCES public.movement_patterns(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Table C: custom_exercises (Coach inventions)
CREATE TABLE public.custom_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  name text NOT NULL,
  movement_pattern_id uuid NOT NULL REFERENCES public.movement_patterns(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coach_id, name)
);

-- 5. Enable RLS
ALTER TABLE public.movement_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_exercises ENABLE ROW LEVEL SECURITY;

-- 6. RLS: movement_patterns (read-only for authenticated, admin managed)
CREATE POLICY "Block anon movement_patterns" ON public.movement_patterns FOR ALL TO anon USING (false);
CREATE POLICY "Authenticated can read movement_patterns" ON public.movement_patterns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage movement_patterns" ON public.movement_patterns FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 7. RLS: global_exercises (read-only for authenticated, admin managed)
CREATE POLICY "Block anon global_exercises" ON public.global_exercises FOR ALL TO anon USING (false);
CREATE POLICY "Authenticated can read global_exercises" ON public.global_exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage global_exercises" ON public.global_exercises FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 8. RLS: custom_exercises (coach owns their exercises)
CREATE POLICY "Block anon custom_exercises" ON public.custom_exercises FOR ALL TO anon USING (false);
CREATE POLICY "Coaches can read own custom_exercises" ON public.custom_exercises FOR SELECT TO authenticated USING (auth.uid() = coach_id);
CREATE POLICY "Coaches can insert own custom_exercises" ON public.custom_exercises FOR INSERT TO authenticated WITH CHECK (auth.uid() = coach_id AND is_coach_or_admin(auth.uid()));
CREATE POLICY "Coaches can delete own custom_exercises" ON public.custom_exercises FOR DELETE TO authenticated USING (auth.uid() = coach_id);
CREATE POLICY "Admins can manage all custom_exercises" ON public.custom_exercises FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 9. Seed movement patterns
INSERT INTO public.movement_patterns (name, formula_type, moved_mass_percentage, default_distance_meters, friction_coefficient, human_efficiency_rate) VALUES
  ('Squat',              'vertical_work',       0.70, 0.70, NULL, 0.20),
  ('Hinge',              'vertical_work',       0.65, 0.50, NULL, 0.20),
  ('Push',               'vertical_work',       0.60, 0.50, NULL, 0.20),
  ('Pull',               'vertical_work',       0.65, 0.60, NULL, 0.20),
  ('Lunge',              'vertical_work',       0.70, 0.60, NULL, 0.20),
  ('Horizontal Friction','horizontal_friction',  0.00, 1.00, 0.45, 0.20),
  ('Carry',              'horizontal_friction',  0.00, 1.00, 0.02, 0.20),
  ('Cardio',             'metabolic',           1.00, 1.00, NULL, 0.20),
  ('Core',               'vertical_work',       0.40, 0.30, NULL, 0.20),
  ('Olympic Lift',       'vertical_work',       0.50, 1.20, NULL, 0.20);

-- 10. Seed global exercises with pattern links
INSERT INTO public.global_exercises (name, movement_pattern_id)
SELECT e.name, mp.id FROM (VALUES
  ('Air Squats',       'Squat'),
  ('Back Squat',       'Squat'),
  ('Front Squat',      'Squat'),
  ('Goblet Squat',     'Squat'),
  ('Wall Balls',       'Squat'),
  ('Thrusters',        'Squat'),
  ('Deadlifts',        'Hinge'),
  ('Kettlebell Swings','Hinge'),
  ('Romanian Deadlift','Hinge'),
  ('Hip Thrusts',      'Hinge'),
  ('Push-ups',         'Push'),
  ('Bench Press',      'Push'),
  ('Shoulder Press',   'Push'),
  ('Handstand Push-ups','Push'),
  ('Dips',             'Push'),
  ('Pull-ups',         'Pull'),
  ('Chin-ups',         'Pull'),
  ('Barbell Row',      'Pull'),
  ('Muscle-ups',       'Pull'),
  ('Toes to Bar',      'Pull'),
  ('Rope Climbs',      'Pull'),
  ('Lunges',           'Lunge'),
  ('Step-ups',         'Lunge'),
  ('Box Jumps',        'Lunge'),
  ('Box Jump Over',    'Lunge'),
  ('Burpees',          'Lunge'),
  ('Burpee Broad Jump','Lunge'),
  ('Sled Push',        'Horizontal Friction'),
  ('Sled Pull',        'Horizontal Friction'),
  ('Farmers Carry',    'Carry'),
  ('Sandbag Carry',    'Carry'),
  ('Running',          'Cardio'),
  ('Rowing',           'Cardio'),
  ('Ski Erg',          'Cardio'),
  ('Assault Bike',     'Cardio'),
  ('Double Unders',    'Cardio'),
  ('Sit-ups',          'Core'),
  ('Plank',            'Core'),
  ('Russian Twist',    'Core'),
  ('Cleans',           'Olympic Lift'),
  ('Snatches',         'Olympic Lift'),
  ('Clean & Jerk',     'Olympic Lift'),
  ('Devil Press',      'Olympic Lift'),
  ('Dumbbell Snatch',  'Olympic Lift')
) AS e(name, pattern_name)
JOIN public.movement_patterns mp ON mp.name = e.pattern_name;
