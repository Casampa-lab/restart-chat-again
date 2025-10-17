-- ===================================================
-- FASE 1: UNIFORMIZAÇÃO DE COORDENADAS + FOTOS MÚLTIPLAS
-- ===================================================

-- 1.1. Renomear coordenadas em PLACAS (latitude → latitude_inicial)
ALTER TABLE ficha_placa 
  RENAME COLUMN latitude TO latitude_inicial;
ALTER TABLE ficha_placa 
  RENAME COLUMN longitude TO longitude_inicial;

-- 1.2. Renomear coordenadas em PÓRTICOS (latitude → latitude_inicial)
ALTER TABLE ficha_porticos 
  RENAME COLUMN latitude TO latitude_inicial;
ALTER TABLE ficha_porticos 
  RENAME COLUMN longitude TO longitude_inicial;

-- 1.3. Adicionar coluna fotos_urls[] nas 7 tabelas de CADASTRO
ALTER TABLE ficha_placa ADD COLUMN IF NOT EXISTS fotos_urls text[] DEFAULT '{}';
ALTER TABLE ficha_porticos ADD COLUMN IF NOT EXISTS fotos_urls text[] DEFAULT '{}';
ALTER TABLE ficha_inscricoes ADD COLUMN IF NOT EXISTS fotos_urls text[] DEFAULT '{}';
ALTER TABLE ficha_marcas_longitudinais ADD COLUMN IF NOT EXISTS fotos_urls text[] DEFAULT '{}';
ALTER TABLE ficha_cilindros ADD COLUMN IF NOT EXISTS fotos_urls text[] DEFAULT '{}';
ALTER TABLE defensas ADD COLUMN IF NOT EXISTS fotos_urls text[] DEFAULT '{}';
ALTER TABLE ficha_tachas ADD COLUMN IF NOT EXISTS fotos_urls text[] DEFAULT '{}';

-- 1.4. Criar índices GIN para performance em arrays
CREATE INDEX IF NOT EXISTS idx_ficha_placa_fotos ON ficha_placa USING gin(fotos_urls);
CREATE INDEX IF NOT EXISTS idx_ficha_porticos_fotos ON ficha_porticos USING gin(fotos_urls);
CREATE INDEX IF NOT EXISTS idx_ficha_inscricoes_fotos ON ficha_inscricoes USING gin(fotos_urls);
CREATE INDEX IF NOT EXISTS idx_ficha_marcas_longitudinais_fotos ON ficha_marcas_longitudinais USING gin(fotos_urls);
CREATE INDEX IF NOT EXISTS idx_ficha_cilindros_fotos ON ficha_cilindros USING gin(fotos_urls);
CREATE INDEX IF NOT EXISTS idx_defensas_fotos ON defensas USING gin(fotos_urls);
CREATE INDEX IF NOT EXISTS idx_ficha_tachas_fotos ON ficha_tachas USING gin(fotos_urls);