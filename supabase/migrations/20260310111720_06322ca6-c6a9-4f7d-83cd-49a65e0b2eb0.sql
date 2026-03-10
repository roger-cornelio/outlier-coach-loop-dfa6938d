
CREATE TABLE public.simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  division text NOT NULL DEFAULT 'HYROX Open',
  total_time integer NOT NULL DEFAULT 0,
  roxzone_time integer NOT NULL DEFAULT 0,
  splits_data jsonb NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own simulations" ON public.simulations
  FOR SELECT TO authenticated USING (auth.uid() = athlete_id);

CREATE POLICY "Users can insert own simulations" ON public.simulations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Users can delete own simulations" ON public.simulations
  FOR DELETE TO authenticated USING (auth.uid() = athlete_id);

CREATE POLICY "Block anon simulations" ON public.simulations
  FOR ALL TO anon USING (false);

CREATE POLICY "Admins can view all simulations" ON public.simulations
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
