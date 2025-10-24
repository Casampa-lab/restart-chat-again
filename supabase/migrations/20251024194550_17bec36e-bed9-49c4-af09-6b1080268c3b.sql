-- Adicionar coluna retro_sv_medicoes para armazenar as 10 medições originais
ALTER TABLE public.ficha_verificacao_itens
  ADD COLUMN IF NOT EXISTS retro_sv_medicoes jsonb;

COMMENT ON COLUMN public.ficha_verificacao_itens.retro_sv_medicoes IS 
'Array com as 10 medições originais de retrorefletividade SV (antes do expurgo) conforme IN 3/2025';