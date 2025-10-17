-- Remove foto_url column from all intervention tables
ALTER TABLE defensas_intervencoes DROP COLUMN IF EXISTS foto_url;
ALTER TABLE ficha_placa_intervencoes DROP COLUMN IF EXISTS foto_url;
ALTER TABLE ficha_marcas_longitudinais_intervencoes DROP COLUMN IF EXISTS foto_url;
ALTER TABLE ficha_cilindros_intervencoes DROP COLUMN IF EXISTS foto_url;
ALTER TABLE ficha_inscricoes_intervencoes DROP COLUMN IF EXISTS foto_url;
ALTER TABLE ficha_tachas_intervencoes DROP COLUMN IF EXISTS foto_url;
ALTER TABLE ficha_porticos_intervencoes DROP COLUMN IF EXISTS foto_url;