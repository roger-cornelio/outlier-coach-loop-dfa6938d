
-- Table: station_valence_weights
-- Deterministic weight matrix mapping HYROX stations to physiological valences (0-3 scale)
CREATE TABLE public.station_valence_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_key text NOT NULL UNIQUE,
  station_label text NOT NULL,
  cardio integer NOT NULL DEFAULT 0 CHECK (cardio BETWEEN 0 AND 3),
  forca integer NOT NULL DEFAULT 0 CHECK (forca BETWEEN 0 AND 3),
  potencia integer NOT NULL DEFAULT 0 CHECK (potencia BETWEEN 0 AND 3),
  anaerobica integer NOT NULL DEFAULT 0 CHECK (anaerobica BETWEEN 0 AND 3),
  core integer NOT NULL DEFAULT 0 CHECK (core BETWEEN 0 AND 3),
  eficiencia integer NOT NULL DEFAULT 0 CHECK (eficiencia BETWEEN 0 AND 3),
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.station_valence_weights ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated can read station_valence_weights"
  ON public.station_valence_weights FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage station_valence_weights"
  ON public.station_valence_weights FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block anon station_valence_weights"
  ON public.station_valence_weights FOR ALL
  TO anon
  USING (false);

-- Seed data from the deterministic matrix
INSERT INTO public.station_valence_weights (station_key, station_label, cardio, forca, potencia, anaerobica, core, eficiencia, sort_order) VALUES
  ('run_total', 'Corrida Total', 3, 0, 0, 1, 0, 0, 1),
  ('ski_erg', 'Ski Erg', 2, 0, 1, 1, 2, 2, 2),
  ('sled_push', 'Sled Push', 1, 3, 1, 3, 1, 0, 3),
  ('sled_pull', 'Sled Pull', 1, 3, 0, 2, 1, 0, 4),
  ('bbj', 'Burpee Broad Jumps', 1, 0, 3, 2, 1, 0, 5),
  ('row', 'Rowing (Remo)', 2, 1, 1, 1, 1, 2, 6),
  ('farmers', 'Farmers Carry', 0, 2, 0, 0, 3, 0, 7),
  ('sandbag', 'Sandbag Lunges', 0, 2, 0, 2, 3, 0, 8),
  ('wallballs', 'Wall Balls', 1, 1, 3, 3, 1, 0, 9),
  ('roxzone', 'Roxzone (Transições)', 0, 0, 0, 0, 0, 3, 10);

-- Trigger for updated_at
CREATE TRIGGER update_station_valence_weights_updated_at
  BEFORE UPDATE ON public.station_valence_weights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
