-- Adicionar campos de coordenadas geográficas na tabela lotes_rodovias
ALTER TABLE public.lotes_rodovias 
ADD COLUMN latitude_inicial NUMERIC,
ADD COLUMN longitude_inicial NUMERIC,
ADD COLUMN latitude_final NUMERIC,
ADD COLUMN longitude_final NUMERIC;