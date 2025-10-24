-- Adicionar colunas de GPS final em ficha_marcas_longitudinais_intervencoes
ALTER TABLE ficha_marcas_longitudinais_intervencoes 
ADD COLUMN IF NOT EXISTS latitude_final DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude_final DOUBLE PRECISION;

-- Adicionar coluna de fotos em ficha_inscricoes_intervencoes
ALTER TABLE ficha_inscricoes_intervencoes 
ADD COLUMN IF NOT EXISTS fotos TEXT[];

COMMENT ON COLUMN ficha_marcas_longitudinais_intervencoes.latitude_final IS 'Latitude do ponto final da intervenção (elementos lineares)';
COMMENT ON COLUMN ficha_marcas_longitudinais_intervencoes.longitude_final IS 'Longitude do ponto final da intervenção (elementos lineares)';
COMMENT ON COLUMN ficha_inscricoes_intervencoes.fotos IS 'Array de URLs das fotos da intervenção';