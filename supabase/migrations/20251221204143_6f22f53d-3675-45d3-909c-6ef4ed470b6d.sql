-- Adicionar campo week_start na tabela workouts
-- Representa a segunda-feira da semana da programação

ALTER TABLE public.workouts 
ADD COLUMN IF NOT EXISTS week_start date;

-- Criar índice para buscas por semana
CREATE INDEX IF NOT EXISTS idx_workouts_week_start ON public.workouts(week_start);

-- Comentário para documentação
COMMENT ON COLUMN public.workouts.week_start IS 'Segunda-feira da semana de referência da programação (campo canônico)';