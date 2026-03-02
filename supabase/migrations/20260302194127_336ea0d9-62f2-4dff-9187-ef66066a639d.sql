
CREATE TABLE public.race_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL,
  hyrox_idp TEXT NOT NULL,
  hyrox_event TEXT,
  source_url TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (athlete_id, hyrox_idp)
);

ALTER TABLE public.race_results ENABLE ROW LEVEL SECURITY;

-- Users can view their own results
CREATE POLICY "Users can view own race_results"
  ON public.race_results FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id);

-- Users can insert their own results
CREATE POLICY "Users can insert own race_results"
  ON public.race_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = athlete_id);

-- Users can delete their own results
CREATE POLICY "Users can delete own race_results"
  ON public.race_results FOR DELETE
  TO authenticated
  USING (auth.uid() = athlete_id);

-- Admins can view all
CREATE POLICY "Admins can view all race_results"
  ON public.race_results FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Block anonymous
CREATE POLICY "Block anonymous access to race_results"
  ON public.race_results FOR SELECT
  TO anon
  USING (false);
