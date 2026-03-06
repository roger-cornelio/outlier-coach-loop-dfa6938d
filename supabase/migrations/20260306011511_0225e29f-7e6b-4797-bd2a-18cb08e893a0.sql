
-- Create scientific_articles table
CREATE TABLE public.scientific_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author_or_source text,
  category text NOT NULL DEFAULT 'General',
  target_station text NOT NULL DEFAULT 'General',
  key_takeaways text,
  full_summary text,
  publication_year integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scientific_articles ENABLE ROW LEVEL SECURITY;

-- Block anonymous access
CREATE POLICY "Block anon scientific_articles"
  ON public.scientific_articles FOR ALL
  USING (false);

-- Admins can manage all articles
CREATE POLICY "Admins can manage scientific_articles"
  ON public.scientific_articles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Authenticated users can read articles (for AI consumption)
CREATE POLICY "Authenticated can read scientific_articles"
  ON public.scientific_articles FOR SELECT
  TO authenticated
  USING (true);
