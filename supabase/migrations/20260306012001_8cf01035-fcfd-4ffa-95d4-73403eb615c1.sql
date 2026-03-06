
-- Add file_url and criteria_tags columns to scientific_articles
ALTER TABLE public.scientific_articles
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS criteria_tags jsonb DEFAULT '[]'::jsonb;

-- Create storage bucket for scientific article files
INSERT INTO storage.buckets (id, name, public)
VALUES ('scientific-articles', 'scientific-articles', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: admins can upload
CREATE POLICY "Admins can upload scientific articles"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'scientific-articles'
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  );

-- Admins can delete
CREATE POLICY "Admins can delete scientific articles files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'scientific-articles'
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  );

-- Anyone authenticated can read
CREATE POLICY "Authenticated can read scientific articles files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'scientific-articles');
