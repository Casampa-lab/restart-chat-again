-- Adicionar coluna retro_sv_medias para armazenar médias expurgadas
ALTER TABLE public.ficha_verificacao_itens
  ADD COLUMN IF NOT EXISTS retro_sv_medias jsonb;

COMMENT ON COLUMN public.ficha_verificacao_itens.retro_sv_medias IS 
'Array com as 8 médias expurgadas (sem maior e menor valor) conforme IN 3/2025';