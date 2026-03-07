ALTER TABLE public.diagnostico_resumo 
  ADD COLUMN IF NOT EXISTS nome_atleta text,
  ADD COLUMN IF NOT EXISTS temporada text,
  ADD COLUMN IF NOT EXISTS evento text,
  ADD COLUMN IF NOT EXISTS divisao text,
  ADD COLUMN IF NOT EXISTS finish_time text;