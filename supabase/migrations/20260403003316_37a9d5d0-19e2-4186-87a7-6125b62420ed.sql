
ALTER TABLE public.diagnostic_leads ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own leads
CREATE POLICY "Users can insert own leads"
ON public.diagnostic_leads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can read their own leads
CREATE POLICY "Users can read own leads"
ON public.diagnostic_leads
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can read all leads
CREATE POLICY "Admins can read all leads"
ON public.diagnostic_leads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update leads
CREATE POLICY "Admins can update all leads"
ON public.diagnostic_leads
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
