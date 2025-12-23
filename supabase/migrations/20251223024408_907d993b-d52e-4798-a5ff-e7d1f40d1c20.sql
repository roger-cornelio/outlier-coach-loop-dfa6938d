-- =============================================
-- TAREFA 1: PROFILES - Garantir que anon não pode SELECT
-- =============================================

-- 1.1) Confirmar RLS ativado (idempotente)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1.2) As policies atuais já exigem auth.uid(), mas vamos garantir
-- que não existe nenhuma policy permissiva pública.
-- (Não há nenhuma para remover com base no schema atual)

-- 1.3) Forçar que a tabela não tenha acesso anônimo explicitamente
-- Usando FORCE ROW LEVEL SECURITY para garantir que mesmo table owners respeitem RLS
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;


-- =============================================
-- TAREFA 2: COACH_APPLICATIONS - Corrigir INSERT público
-- =============================================

-- 2.1) Confirmar RLS ativado (idempotente)
ALTER TABLE public.coach_applications ENABLE ROW LEVEL SECURITY;

-- 2.2) Remover a policy "Public can submit coach applications" que tem WITH CHECK (true)
DROP POLICY IF EXISTS "Public can submit coach applications" ON public.coach_applications;

-- 2.3) Criar nova policy de INSERT que EXIGE autenticação
-- O usuário deve estar logado para submeter uma aplicação
CREATE POLICY "Authenticated users can submit coach applications"
ON public.coach_applications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    -- O auth_user_id deve ser o próprio usuário ou NULL (será preenchido depois)
    auth_user_id IS NULL OR auth_user_id = auth.uid()
  )
);

-- 2.4) Forçar RLS para garantir segurança
ALTER TABLE public.coach_applications FORCE ROW LEVEL SECURITY;