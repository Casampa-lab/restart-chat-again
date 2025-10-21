-- ====================================================================
-- ETAPA 1: Padronizar Coordenadas em Tabelas de Necessidades Pontuais
-- Convenção VABLE: km_inicial, latitude_inicial, longitude_inicial
-- Elementos pontuais NÃO devem ter campos _final
-- ====================================================================

-- 1.1 - necessidades_placas: renomear km → km_inicial
ALTER TABLE necessidades_placas 
  RENAME COLUMN km TO km_inicial;

ALTER TABLE necessidades_placas 
  RENAME COLUMN latitude TO latitude_inicial;

ALTER TABLE necessidades_placas 
  RENAME COLUMN longitude TO longitude_inicial;

-- 1.2 - necessidades_porticos: renomear km → km_inicial
ALTER TABLE necessidades_porticos 
  RENAME COLUMN km TO km_inicial;

ALTER TABLE necessidades_porticos 
  RENAME COLUMN latitude TO latitude_inicial;

ALTER TABLE necessidades_porticos 
  RENAME COLUMN longitude TO longitude_inicial;

-- 1.3 - necessidades_marcas_transversais: remover campos duplicados
-- Primeiro, copiar dados de latitude/longitude para latitude_inicial/longitude_inicial se necessário
UPDATE necessidades_marcas_transversais 
SET latitude_inicial = COALESCE(latitude_inicial, latitude),
    longitude_inicial = COALESCE(longitude_inicial, longitude)
WHERE latitude IS NOT NULL OR longitude IS NOT NULL;

-- Agora remover os campos duplicados
ALTER TABLE necessidades_marcas_transversais 
  DROP COLUMN IF EXISTS latitude;

ALTER TABLE necessidades_marcas_transversais 
  DROP COLUMN IF EXISTS longitude;

ALTER TABLE necessidades_marcas_transversais 
  DROP COLUMN IF EXISTS km;

-- Garantir que campos _inicial existem (caso não existam)
ALTER TABLE necessidades_marcas_transversais 
  ADD COLUMN IF NOT EXISTS km_inicial numeric;

ALTER TABLE necessidades_marcas_transversais 
  ADD COLUMN IF NOT EXISTS latitude_inicial numeric;

ALTER TABLE necessidades_marcas_transversais 
  ADD COLUMN IF NOT EXISTS longitude_inicial numeric;

-- Comentários para documentar convenção VABLE
COMMENT ON COLUMN necessidades_placas.km_inicial IS 'Convenção VABLE: elementos pontuais usam km_inicial (não km)';
COMMENT ON COLUMN necessidades_porticos.km_inicial IS 'Convenção VABLE: elementos pontuais usam km_inicial (não km)';
COMMENT ON COLUMN necessidades_marcas_transversais.km_inicial IS 'Convenção VABLE: elementos pontuais usam km_inicial (não km)';