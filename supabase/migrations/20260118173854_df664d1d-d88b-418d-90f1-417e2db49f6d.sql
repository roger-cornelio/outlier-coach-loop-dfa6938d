-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view hyrox_metric_scores" ON public.hyrox_metric_scores;

-- Create security definer function to check ownership via benchmark_results
CREATE OR REPLACE FUNCTION public.owns_benchmark_result(_benchmark_result_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.benchmark_results
    WHERE id = _benchmark_result_id
      AND user_id = auth.uid()
  )
$$;

-- Policy: Users can view their own scores (linked via benchmark_results.user_id)
CREATE POLICY "Users can view their own hyrox_metric_scores"
ON public.hyrox_metric_scores
FOR SELECT
TO authenticated
USING (public.owns_benchmark_result(hyrox_result_id));

-- Policy: Admins can view all scores
CREATE POLICY "Admins can view all hyrox_metric_scores"
ON public.hyrox_metric_scores
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));