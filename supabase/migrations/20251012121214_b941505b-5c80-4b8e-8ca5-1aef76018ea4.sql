-- Adicionar campos faltantes para marcas longitudinais (necessidades)
ALTER TABLE public.necessidades_marcas_longitudinais
ADD COLUMN IF NOT EXISTS traco_m numeric,
ADD COLUMN IF NOT EXISTS espacamento_m numeric,
ADD COLUMN IF NOT EXISTS area_m2 numeric;

-- Adicionar campos faltantes para marcas longitudinais (cadastro/ficha)
ALTER TABLE public.ficha_marcas_longitudinais
ADD COLUMN IF NOT EXISTS traco_m numeric,
ADD COLUMN IF NOT EXISTS espacamento_m numeric,
ADD COLUMN IF NOT EXISTS area_m2 numeric;

COMMENT ON COLUMN public.necessidades_marcas_longitudinais.traco_m IS 'Tamanho do traço em metros';
COMMENT ON COLUMN public.necessidades_marcas_longitudinais.espacamento_m IS 'Espaçamento entre traços em metros';
COMMENT ON COLUMN public.necessidades_marcas_longitudinais.area_m2 IS 'Área de pintura em m²';

COMMENT ON COLUMN public.ficha_marcas_longitudinais.traco_m IS 'Tamanho do traço em metros';
COMMENT ON COLUMN public.ficha_marcas_longitudinais.espacamento_m IS 'Espaçamento entre traços em metros';
COMMENT ON COLUMN public.ficha_marcas_longitudinais.area_m2 IS 'Área de pintura em m²';