
-- Coach scores table: manual admin rating + auto-calculated metrics
CREATE TABLE public.coach_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL UNIQUE,
  -- Manual admin fields
  admin_rating integer DEFAULT 0,
  admin_notes text,
  -- Auto-calculated fields (updated by triggers or cron)
  active_athletes_count integer DEFAULT 0,
  churned_athletes_count integer DEFAULT 0,
  avg_athlete_sessions_per_week numeric DEFAULT 0,
  avg_athlete_retention_days integer DEFAULT 0,
  plans_published_last_30d integer DEFAULT 0,
  athlete_avg_benchmark_improvement numeric DEFAULT 0,
  -- Composite score (higher = better)
  composite_score numeric DEFAULT 0,
  -- Metadata
  is_visible boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.coach_scores ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read visible coach scores (for onboarding recommendations)
CREATE POLICY "Authenticated can read visible coach_scores"
  ON public.coach_scores FOR SELECT TO authenticated
  USING (is_visible = true);

-- Admins can manage all
CREATE POLICY "Admins can manage coach_scores"
  ON public.coach_scores FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Coaches can read their own score
CREATE POLICY "Coaches can read own score"
  ON public.coach_scores FOR SELECT TO authenticated
  USING (coach_id = auth.uid());

-- Block anon
CREATE POLICY "Block anon coach_scores"
  ON public.coach_scores FOR ALL TO anon
  USING (false);

-- Updated_at trigger
CREATE TRIGGER update_coach_scores_updated_at
  BEFORE UPDATE ON public.coach_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RPC to search coaches by name (for onboarding)
CREATE OR REPLACE FUNCTION public.search_coaches_by_name(_search text)
RETURNS TABLE(
  coach_id uuid,
  coach_name text,
  box_name text,
  city text,
  composite_score numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ca.auth_user_id as coach_id,
    ca.full_name as coach_name,
    ca.box_name,
    ca.city,
    COALESCE(cs.composite_score, 0) as composite_score
  FROM public.coach_applications ca
  LEFT JOIN public.coach_scores cs ON cs.coach_id = ca.auth_user_id
  WHERE ca.status = 'approved'
    AND ca.auth_user_id IS NOT NULL
    AND (
      _search = '' 
      OR _search IS NULL 
      OR ca.full_name ILIKE '%' || _search || '%'
      OR ca.box_name ILIKE '%' || _search || '%'
    )
  ORDER BY ca.full_name ASC
  LIMIT 20;
$$;

-- RPC to get top recommended coaches
CREATE OR REPLACE FUNCTION public.get_recommended_coaches(_limit integer DEFAULT 5)
RETURNS TABLE(
  coach_id uuid,
  coach_name text,
  box_name text,
  city text,
  composite_score numeric,
  active_athletes_count integer,
  admin_rating integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ca.auth_user_id as coach_id,
    ca.full_name as coach_name,
    ca.box_name,
    ca.city,
    COALESCE(cs.composite_score, 0) as composite_score,
    COALESCE(cs.active_athletes_count, 0) as active_athletes_count,
    COALESCE(cs.admin_rating, 0) as admin_rating
  FROM public.coach_applications ca
  LEFT JOIN public.coach_scores cs ON cs.coach_id = ca.auth_user_id
  WHERE ca.status = 'approved'
    AND ca.auth_user_id IS NOT NULL
    AND COALESCE(cs.is_visible, true) = true
  ORDER BY 
    COALESCE(cs.composite_score, 0) DESC,
    COALESCE(cs.admin_rating, 0) DESC,
    COALESCE(cs.active_athletes_count, 0) DESC
  LIMIT _limit;
$$;
