-- Add result_type and screenshot_url columns to benchmark_results
ALTER TABLE public.benchmark_results 
ADD COLUMN IF NOT EXISTS result_type TEXT DEFAULT 'benchmark' CHECK (result_type IN ('benchmark', 'simulado', 'prova_oficial')),
ADD COLUMN IF NOT EXISTS screenshot_url TEXT,
ADD COLUMN IF NOT EXISTS event_name TEXT,
ADD COLUMN IF NOT EXISTS event_date DATE;

-- Create storage bucket for result screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('result-screenshots', 'result-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to the bucket
CREATE POLICY "Users can upload their own screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'result-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to screenshots
CREATE POLICY "Screenshots are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'result-screenshots');

-- Allow users to delete their own screenshots
CREATE POLICY "Users can delete their own screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'result-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);