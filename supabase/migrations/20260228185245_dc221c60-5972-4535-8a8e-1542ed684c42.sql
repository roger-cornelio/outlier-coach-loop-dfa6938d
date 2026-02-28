
-- Table for athlete races (provas alvo + satélite)
CREATE TABLE public.athlete_races (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  race_type TEXT NOT NULL DEFAULT 'ALVO', -- 'ALVO' or 'SATELITE'
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'HYROX Open',
  race_date DATE NOT NULL,
  participation_type TEXT NOT NULL DEFAULT 'INDIVIDUAL', -- 'INDIVIDUAL' or 'DUPLA'
  partner_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.athlete_races ENABLE ROW LEVEL SECURITY;

-- Users can manage their own races
CREATE POLICY "Users can view own races" ON public.athlete_races
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own races" ON public.athlete_races
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own races" ON public.athlete_races
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own races" ON public.athlete_races
  FOR DELETE USING (auth.uid() = user_id);

-- Coaches can view their athletes' races
CREATE POLICY "Coaches can view athlete races" ON public.athlete_races
  FOR SELECT USING (can_view_athlete_data(auth.uid(), user_id));

-- Admins can view all races
CREATE POLICY "Admins can view all races" ON public.athlete_races
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Block anonymous
CREATE POLICY "Block anonymous access" ON public.athlete_races
  FOR SELECT USING (false);
