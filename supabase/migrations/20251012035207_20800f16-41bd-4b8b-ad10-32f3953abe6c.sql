-- Adicionar colunas faltantes em necessidades_marcas_longitudinais
ALTER TABLE public.necessidades_marcas_longitudinais 
ADD COLUMN IF NOT EXISTS codigo text,
ADD COLUMN IF NOT EXISTS posicao text;