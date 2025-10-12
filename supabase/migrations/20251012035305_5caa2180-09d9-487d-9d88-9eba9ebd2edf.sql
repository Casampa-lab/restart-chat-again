-- Adicionar colunas faltantes em ficha_marcas_longitudinais para permitir match
ALTER TABLE public.ficha_marcas_longitudinais 
ADD COLUMN IF NOT EXISTS codigo text,
ADD COLUMN IF NOT EXISTS posicao text;