-- Adicionar campos de coordenadas geográficas na tabela defensas
ALTER TABLE public.defensas 
ADD COLUMN IF NOT EXISTS latitude_inicial numeric,
ADD COLUMN IF NOT EXISTS longitude_inicial numeric,
ADD COLUMN IF NOT EXISTS latitude_final numeric,
ADD COLUMN IF NOT EXISTS longitude_final numeric;