-- Adicionar colunas para configurações do atleta na tabela profiles
-- Isso permite persistência das preferências entre sessões

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS training_level text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS session_duration text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS altura integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS peso numeric(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS idade integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sexo text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS unavailable_equipment jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS equipment_notes text DEFAULT NULL;

-- Índice para buscas futuras
CREATE INDEX IF NOT EXISTS idx_profiles_training_level ON public.profiles(training_level);

COMMENT ON COLUMN public.profiles.training_level IS 'Nível de treino: base, progressivo, performance';
COMMENT ON COLUMN public.profiles.session_duration IS 'Duração da sessão: 30, 45, 60, 90, ilimitado';
COMMENT ON COLUMN public.profiles.altura IS 'Altura em cm';
COMMENT ON COLUMN public.profiles.peso IS 'Peso em kg';
COMMENT ON COLUMN public.profiles.idade IS 'Idade em anos';
COMMENT ON COLUMN public.profiles.sexo IS 'masculino ou feminino';
COMMENT ON COLUMN public.profiles.unavailable_equipment IS 'Lista de equipamentos indisponíveis';
COMMENT ON COLUMN public.profiles.equipment_notes IS 'Notas sobre equipamentos';