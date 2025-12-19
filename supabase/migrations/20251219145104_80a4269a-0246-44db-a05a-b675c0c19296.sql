-- 1) Criar tabela admin_allowlist
CREATE TABLE IF NOT EXISTS public.admin_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'revoked')),
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;

-- RLS: Apenas superadmin pode ver/modificar
CREATE POLICY "Superadmins can view allowlist"
  ON public.admin_allowlist FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can insert allowlist"
  ON public.admin_allowlist FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can update allowlist"
  ON public.admin_allowlist FOR UPDATE
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can delete allowlist"
  ON public.admin_allowlist FOR DELETE
  USING (public.has_role(auth.uid(), 'superadmin'));

-- 2) Função para garantir superadmin role (chamada no bootstrap)
CREATE OR REPLACE FUNCTION public.ensure_superadmin_role(_user_id uuid, _email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  superadmin_emails text[] := ARRAY['paulo.oselieri@gmail.com'];
BEGIN
  -- Só executa se o email estiver na lista fixa
  IF _email = ANY(superadmin_emails) THEN
    -- Insere superadmin sem remover outras roles (coach pode ser superadmin também)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'superadmin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

-- 3) Função para sincronizar role de admin baseado na allowlist
CREATE OR REPLACE FUNCTION public.sync_admin_role_from_allowlist(_user_id uuid, _email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowlist_status text;
  current_role text;
BEGIN
  -- Verifica se já é superadmin (não mexe)
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'superadmin') THEN
    RETURN 'superadmin';
  END IF;
  
  -- Verifica na allowlist
  SELECT status INTO allowlist_status 
  FROM public.admin_allowlist 
  WHERE email = _email;
  
  IF allowlist_status = 'approved' THEN
    -- Promove para admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN 'admin';
  ELSE
    -- Remove admin se existir e não está na allowlist aprovada
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
    
    -- Retorna a role atual (coach ou user)
    SELECT role::text INTO current_role 
    FROM public.user_roles 
    WHERE user_id = _user_id AND role IN ('coach', 'user')
    ORDER BY CASE role WHEN 'coach' THEN 1 ELSE 2 END
    LIMIT 1;
    
    RETURN COALESCE(current_role, 'user');
  END IF;
END;
$$;

-- 4) Função para adicionar email à allowlist (apenas superadmin)
CREATE OR REPLACE FUNCTION public.add_admin_allowlist(_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica se caller é superadmin
  IF NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Only superadmins can manage admin allowlist';
  END IF;
  
  INSERT INTO public.admin_allowlist (email, status, created_by)
  VALUES (_email, 'approved', auth.uid())
  ON CONFLICT (email) DO UPDATE SET status = 'approved';
  
  RETURN true;
END;
$$;

-- 5) Função para revogar admin da allowlist (apenas superadmin)
CREATE OR REPLACE FUNCTION public.revoke_admin_allowlist(_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica se caller é superadmin
  IF NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Only superadmins can manage admin allowlist';
  END IF;
  
  UPDATE public.admin_allowlist 
  SET status = 'revoked'
  WHERE email = _email;
  
  RETURN true;
END;
$$;

-- 6) Atualizar has_role para suportar superadmin como admin também
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role 
        OR (role = 'superadmin' AND _role = 'admin') -- superadmin tem acesso de admin
      )
  )
$$;