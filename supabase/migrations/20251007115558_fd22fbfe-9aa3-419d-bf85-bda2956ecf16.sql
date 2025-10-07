-- Adicionar colunas de coordenadas GPS à tabela frentes_liberadas
ALTER TABLE public.frentes_liberadas
ADD COLUMN latitude_inicial numeric,
ADD COLUMN longitude_inicial numeric,
ADD COLUMN latitude_final numeric,
ADD COLUMN longitude_final numeric;