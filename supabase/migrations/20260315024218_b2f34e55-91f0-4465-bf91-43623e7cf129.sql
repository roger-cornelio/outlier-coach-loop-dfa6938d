
CREATE TABLE public.crm_clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  instagram TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_crm_clientes_nome ON public.crm_clientes(nome);
CREATE INDEX idx_crm_clientes_telefone ON public.crm_clientes(telefone);

ALTER TABLE public.crm_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage crm_clientes" ON public.crm_clientes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
