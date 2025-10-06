-- Adicionar colunas de coordenadas geográficas nas tabelas de intervenções e retrorrefletividade

-- Intervenções - Inscrições
ALTER TABLE intervencoes_inscricoes
ADD COLUMN IF NOT EXISTS latitude_inicial numeric,
ADD COLUMN IF NOT EXISTS longitude_inicial numeric,
ADD COLUMN IF NOT EXISTS latitude_final numeric,
ADD COLUMN IF NOT EXISTS longitude_final numeric;

-- Intervenções - SH (Sinalização Horizontal)
ALTER TABLE intervencoes_sh
ADD COLUMN IF NOT EXISTS latitude_inicial numeric,
ADD COLUMN IF NOT EXISTS longitude_inicial numeric,
ADD COLUMN IF NOT EXISTS latitude_final numeric,
ADD COLUMN IF NOT EXISTS longitude_final numeric;

-- Intervenções - SV (Sinalização Vertical)
ALTER TABLE intervencoes_sv
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric;

-- Intervenções - Tacha
ALTER TABLE intervencoes_tacha
ADD COLUMN IF NOT EXISTS latitude_inicial numeric,
ADD COLUMN IF NOT EXISTS longitude_inicial numeric,
ADD COLUMN IF NOT EXISTS latitude_final numeric,
ADD COLUMN IF NOT EXISTS longitude_final numeric;

-- Retrorrefletividade Dinâmica
ALTER TABLE retrorrefletividade_dinamica
ADD COLUMN IF NOT EXISTS latitude_inicial numeric,
ADD COLUMN IF NOT EXISTS longitude_inicial numeric,
ADD COLUMN IF NOT EXISTS latitude_final numeric,
ADD COLUMN IF NOT EXISTS longitude_final numeric;

-- Retrorrefletividade Estática
ALTER TABLE retrorrefletividade_estatica
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric;

COMMENT ON COLUMN intervencoes_inscricoes.latitude_inicial IS 'Latitude do ponto inicial da intervenção';
COMMENT ON COLUMN intervencoes_inscricoes.longitude_inicial IS 'Longitude do ponto inicial da intervenção';
COMMENT ON COLUMN intervencoes_inscricoes.latitude_final IS 'Latitude do ponto final da intervenção';
COMMENT ON COLUMN intervencoes_inscricoes.longitude_final IS 'Longitude do ponto final da intervenção';

COMMENT ON COLUMN intervencoes_sh.latitude_inicial IS 'Latitude do ponto inicial da intervenção';
COMMENT ON COLUMN intervencoes_sh.longitude_inicial IS 'Longitude do ponto inicial da intervenção';
COMMENT ON COLUMN intervencoes_sh.latitude_final IS 'Latitude do ponto final da intervenção';
COMMENT ON COLUMN intervencoes_sh.longitude_final IS 'Longitude do ponto final da intervenção';

COMMENT ON COLUMN intervencoes_sv.latitude IS 'Latitude da intervenção';
COMMENT ON COLUMN intervencoes_sv.longitude IS 'Longitude da intervenção';

COMMENT ON COLUMN intervencoes_tacha.latitude_inicial IS 'Latitude do ponto inicial da intervenção';
COMMENT ON COLUMN intervencoes_tacha.longitude_inicial IS 'Longitude do ponto inicial da intervenção';
COMMENT ON COLUMN intervencoes_tacha.latitude_final IS 'Latitude do ponto final da intervenção';
COMMENT ON COLUMN intervencoes_tacha.longitude_final IS 'Longitude do ponto final da intervenção';

COMMENT ON COLUMN retrorrefletividade_dinamica.latitude_inicial IS 'Latitude do ponto inicial da medição';
COMMENT ON COLUMN retrorrefletividade_dinamica.longitude_inicial IS 'Longitude do ponto inicial da medição';
COMMENT ON COLUMN retrorrefletividade_dinamica.latitude_final IS 'Latitude do ponto final da medição';
COMMENT ON COLUMN retrorrefletividade_dinamica.longitude_final IS 'Longitude do ponto final da medição';

COMMENT ON COLUMN retrorrefletividade_estatica.latitude IS 'Latitude da medição';
COMMENT ON COLUMN retrorrefletividade_estatica.longitude IS 'Longitude da medição';