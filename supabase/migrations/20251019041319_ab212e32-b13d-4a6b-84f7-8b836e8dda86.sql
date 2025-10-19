-- Adicionar colunas para armazenar arrays de médias expurgadas
-- Conforme IN 3/2025: 10 pontos de medição, cada um com 10 leituras expurgadas

ALTER TABLE ficha_verificacao_itens
ADD COLUMN IF NOT EXISTS retro_bd_medias JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS retro_e_medias JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS retro_be_medias JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS retro_sv_medias JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN ficha_verificacao_itens.retro_bd_medias IS 'Array com as 10 médias expurgadas de retrorefletividade BD (mcd/lux)';
COMMENT ON COLUMN ficha_verificacao_itens.retro_e_medias IS 'Array com as 10 médias expurgadas de retrorefletividade E (mcd/lux)';
COMMENT ON COLUMN ficha_verificacao_itens.retro_be_medias IS 'Array com as 10 médias expurgadas de retrorefletividade BE (mcd/lux)';
COMMENT ON COLUMN ficha_verificacao_itens.retro_sv_medias IS 'Array com as 10 médias expurgadas de retrorefletividade SV (cd/lux/m²)';