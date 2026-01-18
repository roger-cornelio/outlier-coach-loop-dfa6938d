-- Create system_params table for centralized parameter management
-- Parameters are versioned and audited (who changed, when)
CREATE TABLE public.system_params (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for category filtering
CREATE INDEX idx_system_params_category ON public.system_params(category);

-- Enable RLS
ALTER TABLE public.system_params ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_params FORCE ROW LEVEL SECURITY;

-- Block anonymous access completely
CREATE POLICY "Block anonymous access to system_params"
  ON public.system_params
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);

-- Only admins/superadmins can SELECT
CREATE POLICY "Admins can view system_params"
  ON public.system_params
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'superadmin')
  );

-- Only admins/superadmins can INSERT
CREATE POLICY "Admins can insert system_params"
  ON public.system_params
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'superadmin')
  );

-- Only admins/superadmins can UPDATE
CREATE POLICY "Admins can update system_params"
  ON public.system_params
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'superadmin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'superadmin')
  );

-- Block DELETE (params should be updated, not deleted)
CREATE POLICY "Block delete of system_params"
  ON public.system_params
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_system_params_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_system_params_updated_at
  BEFORE UPDATE ON public.system_params
  FOR EACH ROW
  EXECUTE FUNCTION public.update_system_params_timestamp();

-- Add table comment
COMMENT ON TABLE public.system_params IS 'Centralized system parameters with audit trail. Only admins can view/edit. Never stores secrets - use Project Secrets for sensitive data.';