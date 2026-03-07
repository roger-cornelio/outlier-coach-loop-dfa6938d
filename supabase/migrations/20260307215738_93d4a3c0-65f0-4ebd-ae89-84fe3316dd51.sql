
-- Add resumo_id to diagnostico_melhoria to link each improvement row to a specific race diagnostic
ALTER TABLE public.diagnostico_melhoria 
ADD COLUMN resumo_id uuid REFERENCES public.diagnostico_resumo(id) ON DELETE CASCADE;

-- Add resumo_id to tempos_splits to link each split row to a specific race diagnostic
ALTER TABLE public.tempos_splits 
ADD COLUMN resumo_id uuid REFERENCES public.diagnostico_resumo(id) ON DELETE CASCADE;
