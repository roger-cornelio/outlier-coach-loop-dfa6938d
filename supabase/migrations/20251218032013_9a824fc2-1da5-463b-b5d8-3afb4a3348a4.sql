-- Update benchmark_results RLS policies
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own benchmark results " ON public.benchmark_results;
DROP POLICY IF EXISTS "Users can insert their own benchmark results " ON public.benchmark_results;
DROP POLICY IF EXISTS "Users can update their own benchmark results " ON public.benchmark_results;
DROP POLICY IF EXISTS "Users can delete their own benchmark results " ON public.benchmark_results;

-- New policy: View own data OR coach/admin can view assigned athletes
CREATE POLICY "view_benchmark_results_policy"
ON public.benchmark_results FOR SELECT
USING (public.can_view_athlete_data(auth.uid(), user_id));

-- Users can only insert/update/delete their own data
CREATE POLICY "insert_own_benchmark_results_policy"
ON public.benchmark_results FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_benchmark_results_policy"
ON public.benchmark_results FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "delete_own_benchmark_results_policy"
ON public.benchmark_results FOR DELETE
USING (auth.uid() = user_id);