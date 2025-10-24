-- Adicionar colunas GPS Final e fotos na tabela de intervenções de marcas longitudinais
ALTER TABLE ficha_marcas_longitudinais_intervencoes 
ADD COLUMN IF NOT EXISTS latitude_final DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude_final DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS fotos TEXT[] DEFAULT '{}';

COMMENT ON COLUMN ficha_marcas_longitudinais_intervencoes.latitude_final 
IS 'Latitude do ponto final da marca longitudinal (capturada via GPS)';

COMMENT ON COLUMN ficha_marcas_longitudinais_intervencoes.longitude_final 
IS 'Longitude do ponto final da marca longitudinal (capturada via GPS)';

COMMENT ON COLUMN ficha_marcas_longitudinais_intervencoes.fotos 
IS 'Array de URLs públicas das fotos da intervenção (Supabase Storage bucket: intervencoes-fotos)';