-- =============================================
-- TAREFA 1: Adicionar campos de suspensão à tabela profiles
-- =============================================

-- Adicionar coluna status com default 'active'
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Adicionar coluna suspended_at (nullable)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone;

-- Adicionar coluna suspended_by (nullable, referencia auth.users)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS suspended_by uuid;

-- Adicionar check constraint para status
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_status_check 
CHECK (status IN ('active', 'suspended'));

-- Criar índice para queries frequentes por status
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Comentários para documentação
COMMENT ON COLUMN public.profiles.status IS 'User account status: active or suspended';
COMMENT ON COLUMN public.profiles.suspended_at IS 'Timestamp when user was suspended';
COMMENT ON COLUMN public.profiles.suspended_by IS 'User ID who suspended this user';