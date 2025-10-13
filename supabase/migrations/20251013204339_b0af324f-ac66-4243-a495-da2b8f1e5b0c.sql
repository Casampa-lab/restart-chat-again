-- Remove campos de condição/avaliação do inventário de marcas longitudinais
ALTER TABLE public.ficha_marcas_longitudinais
DROP COLUMN IF EXISTS estado_conservacao,
DROP COLUMN IF EXISTS foto_url,
DROP COLUMN IF EXISTS observacao;

-- Adiciona campos de condição/avaliação às intervenções de marcas longitudinais
ALTER TABLE public.ficha_marcas_longitudinais_intervencoes
ADD COLUMN IF NOT EXISTS estado_conservacao text,
ADD COLUMN IF NOT EXISTS foto_url text,
ADD COLUMN IF NOT EXISTS observacao text;