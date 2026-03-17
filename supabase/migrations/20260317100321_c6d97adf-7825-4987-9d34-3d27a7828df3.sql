
CREATE TABLE public.exercise_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  exercise_name TEXT NOT NULL,
  context_block_title TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  movement_pattern_id UUID REFERENCES public.movement_patterns(id),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exercise_suggestions ENABLE ROW LEVEL SECURITY;

-- Block anon
CREATE POLICY "Block anon exercise_suggestions"
  ON public.exercise_suggestions FOR ALL TO anon USING (false);

-- Coaches can insert their own suggestions
CREATE POLICY "Coaches can insert own suggestions"
  ON public.exercise_suggestions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = coach_id);

-- Coaches can read their own suggestions
CREATE POLICY "Coaches can read own suggestions"
  ON public.exercise_suggestions FOR SELECT TO authenticated
  USING (auth.uid() = coach_id);

-- Admins can read all suggestions
CREATE POLICY "Admins can read all suggestions"
  ON public.exercise_suggestions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all suggestions
CREATE POLICY "Admins can update all suggestions"
  ON public.exercise_suggestions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
