-- Adicionar campos para NC com extensão (início e fim)
ALTER TABLE public.nao_conformidades
ADD COLUMN km_inicial numeric,
ADD COLUMN km_final numeric,
ADD COLUMN latitude_inicial numeric,
ADD COLUMN longitude_inicial numeric,
ADD COLUMN latitude_final numeric,
ADD COLUMN longitude_final numeric;

-- Tornar campos pontuais nullable já que agora são condicionais
ALTER TABLE public.nao_conformidades
ALTER COLUMN latitude DROP NOT NULL,
ALTER COLUMN longitude DROP NOT NULL;

COMMENT ON COLUMN public.nao_conformidades.km_inicial IS 'KM inicial para NC de extensão (Sinalização Horizontal e Dispositivos de Segurança)';
COMMENT ON COLUMN public.nao_conformidades.km_final IS 'KM final para NC de extensão (Sinalização Horizontal e Dispositivos de Segurança)';
COMMENT ON COLUMN public.nao_conformidades.latitude_inicial IS 'Latitude inicial para NC de extensão';
COMMENT ON COLUMN public.nao_conformidades.longitude_inicial IS 'Longitude inicial para NC de extensão';
COMMENT ON COLUMN public.nao_conformidades.latitude_final IS 'Latitude final para NC de extensão';
COMMENT ON COLUMN public.nao_conformidades.longitude_final IS 'Longitude final para NC de extensão';
COMMENT ON COLUMN public.nao_conformidades.km_referencia IS 'KM de referência para NC pontual (Sinalização Vertical)';
COMMENT ON COLUMN public.nao_conformidades.latitude IS 'Latitude para NC pontual (Sinalização Vertical)';
COMMENT ON COLUMN public.nao_conformidades.longitude IS 'Longitude para NC pontual (Sinalização Vertical)';