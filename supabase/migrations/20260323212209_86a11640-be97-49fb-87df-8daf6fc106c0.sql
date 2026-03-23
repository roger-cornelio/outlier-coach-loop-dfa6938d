
-- Table to store workout session feedback from athletes to coaches
CREATE TABLE public.workout_session_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  coach_id uuid REFERENCES public.profiles(id),
  workout_day text NOT NULL,
  workout_stimulus text,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  block_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  athlete_comment text,
  ai_feedback text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workout_session_feedback ENABLE ROW LEVEL SECURITY;

-- Block anon
CREATE POLICY "Block anon workout_session_feedback"
  ON public.workout_session_feedback
  FOR ALL TO anon
  USING (false);

-- Athletes can insert their own feedback
CREATE POLICY "Athletes can insert own feedback"
  ON public.workout_session_feedback
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = athlete_id);

-- Athletes can view their own feedback
CREATE POLICY "Athletes can view own feedback"
  ON public.workout_session_feedback
  FOR SELECT TO authenticated
  USING (auth.uid() = athlete_id);

-- Coaches can view feedback from their linked athletes
CREATE POLICY "Coaches can view athlete feedback"
  ON public.workout_session_feedback
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'coach') AND
    EXISTS (
      SELECT 1 FROM public.coach_athletes ca
      WHERE ca.coach_id = auth.uid() AND ca.athlete_id = workout_session_feedback.athlete_id
    )
  );

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
  ON public.workout_session_feedback
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
