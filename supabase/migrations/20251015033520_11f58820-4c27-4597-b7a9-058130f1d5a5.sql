-- Fase 1.1: Adicionar campos GPS em todas tabelas de intervenções

-- Adicionar latitude e longitude em ficha_placa_intervencoes
ALTER TABLE public.ficha_placa_intervencoes 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Adicionar latitude e longitude em ficha_marcas_longitudinais_intervencoes
ALTER TABLE public.ficha_marcas_longitudinais_intervencoes 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Adicionar latitude e longitude em ficha_tachas_intervencoes
ALTER TABLE public.ficha_tachas_intervencoes 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Adicionar latitude e longitude em ficha_cilindros_intervencoes
ALTER TABLE public.ficha_cilindros_intervencoes 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Adicionar latitude e longitude em ficha_inscricoes_intervencoes
ALTER TABLE public.ficha_inscricoes_intervencoes 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Adicionar latitude e longitude em ficha_porticos_intervencoes
ALTER TABLE public.ficha_porticos_intervencoes 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Adicionar latitude e longitude em defensas_intervencoes
ALTER TABLE public.defensas_intervencoes 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.ficha_placa_intervencoes.latitude IS 'Latitude GPS capturada durante a intervenção';
COMMENT ON COLUMN public.ficha_placa_intervencoes.longitude IS 'Longitude GPS capturada durante a intervenção';
COMMENT ON COLUMN public.ficha_marcas_longitudinais_intervencoes.latitude IS 'Latitude GPS capturada durante a intervenção';
COMMENT ON COLUMN public.ficha_marcas_longitudinais_intervencoes.longitude IS 'Longitude GPS capturada durante a intervenção';
COMMENT ON COLUMN public.ficha_tachas_intervencoes.latitude IS 'Latitude GPS capturada durante a intervenção';
COMMENT ON COLUMN public.ficha_tachas_intervencoes.longitude IS 'Longitude GPS capturada durante a intervenção';
COMMENT ON COLUMN public.ficha_cilindros_intervencoes.latitude IS 'Latitude GPS capturada durante a intervenção';
COMMENT ON COLUMN public.ficha_cilindros_intervencoes.longitude IS 'Longitude GPS capturada durante a intervenção';
COMMENT ON COLUMN public.ficha_inscricoes_intervencoes.latitude IS 'Latitude GPS capturada durante a intervenção';
COMMENT ON COLUMN public.ficha_inscricoes_intervencoes.longitude IS 'Longitude GPS capturada durante a intervenção';
COMMENT ON COLUMN public.ficha_porticos_intervencoes.latitude IS 'Latitude GPS capturada durante a intervenção';
COMMENT ON COLUMN public.ficha_porticos_intervencoes.longitude IS 'Longitude GPS capturada durante a intervenção';
COMMENT ON COLUMN public.defensas_intervencoes.latitude IS 'Latitude GPS capturada durante a intervenção';
COMMENT ON COLUMN public.defensas_intervencoes.longitude IS 'Longitude GPS capturada durante a intervenção';