-- Migration: Adicionar colunas de matching linear às necessidades
-- Data: 2025-01-19
-- Motivo: Suportar auditoria de matching por sobreposição de segmentos

-- ========== MARCAS LONGITUDINAIS ==========
ALTER TABLE necessidades_marcas_longitudinais
ADD COLUMN IF NOT EXISTS overlap_porcentagem NUMERIC;

ALTER TABLE necessidades_marcas_longitudinais
ADD COLUMN IF NOT EXISTS tipo_match TEXT;

COMMENT ON COLUMN necessidades_marcas_longitudinais.overlap_porcentagem IS 
  'Percentual de sobreposição KM entre necessidade e cadastro matched (0-100). NULL = sem match ou matching pontual GPS.';

COMMENT ON COLUMN necessidades_marcas_longitudinais.tipo_match IS 
  'Método de matching usado: snv (SNV exato), km (sobreposição), gps (coordenadas), hibrido (múltiplos critérios). NULL = sem match.';

-- ========== MARCAS TRANSVERSAIS (INSCRIÇÕES) ==========
ALTER TABLE necessidades_marcas_transversais
ADD COLUMN IF NOT EXISTS overlap_porcentagem NUMERIC;

ALTER TABLE necessidades_marcas_transversais
ADD COLUMN IF NOT EXISTS tipo_match TEXT;

COMMENT ON COLUMN necessidades_marcas_transversais.overlap_porcentagem IS 
  'Percentual de sobreposição KM entre necessidade e cadastro matched (0-100). NULL = sem match ou matching pontual GPS.';

COMMENT ON COLUMN necessidades_marcas_transversais.tipo_match IS 
  'Método de matching usado: snv (SNV exato), km (sobreposição), gps (coordenadas), hibrido (múltiplos critérios). NULL = sem match.';

-- ========== TACHAS ==========
ALTER TABLE necessidades_tachas
ADD COLUMN IF NOT EXISTS overlap_porcentagem NUMERIC;

ALTER TABLE necessidades_tachas
ADD COLUMN IF NOT EXISTS tipo_match TEXT;

COMMENT ON COLUMN necessidades_tachas.overlap_porcentagem IS 
  'Percentual de sobreposição KM entre necessidade e cadastro matched (0-100). NULL = sem match ou matching pontual GPS.';

COMMENT ON COLUMN necessidades_tachas.tipo_match IS 
  'Método de matching usado: snv (SNV exato), km (sobreposição), gps (coordenadas), hibrido (múltiplos critérios). NULL = sem match.';

-- ========== CILINDROS ==========
ALTER TABLE necessidades_cilindros
ADD COLUMN IF NOT EXISTS overlap_porcentagem NUMERIC;

ALTER TABLE necessidades_cilindros
ADD COLUMN IF NOT EXISTS tipo_match TEXT;

COMMENT ON COLUMN necessidades_cilindros.overlap_porcentagem IS 
  'Percentual de sobreposição KM entre necessidade e cadastro matched (0-100). NULL = sem match ou matching pontual GPS.';

COMMENT ON COLUMN necessidades_cilindros.tipo_match IS 
  'Método de matching usado: snv (SNV exato), km (sobreposição), gps (coordenadas), hibrido (múltiplos critérios). NULL = sem match.';

-- ========== DEFENSAS ==========
ALTER TABLE necessidades_defensas
ADD COLUMN IF NOT EXISTS overlap_porcentagem NUMERIC;

ALTER TABLE necessidades_defensas
ADD COLUMN IF NOT EXISTS tipo_match TEXT;

COMMENT ON COLUMN necessidades_defensas.overlap_porcentagem IS 
  'Percentual de sobreposição KM entre necessidade e cadastro matched (0-100). NULL = sem match ou matching pontual GPS.';

COMMENT ON COLUMN necessidades_defensas.tipo_match IS 
  'Método de matching usado: snv (SNV exato), km (sobreposição), gps (coordenadas), hibrido (múltiplos critérios). NULL = sem match.';

-- ========== ÍNDICES PARA PERFORMANCE ==========

-- Índices para overlap_porcentagem (apenas valores altos = matches precisos)
CREATE INDEX IF NOT EXISTS idx_nec_marcas_long_overlap 
  ON necessidades_marcas_longitudinais(overlap_porcentagem) 
  WHERE overlap_porcentagem >= 50;

CREATE INDEX IF NOT EXISTS idx_nec_marcas_trans_overlap 
  ON necessidades_marcas_transversais(overlap_porcentagem) 
  WHERE overlap_porcentagem >= 50;

CREATE INDEX IF NOT EXISTS idx_nec_tachas_overlap 
  ON necessidades_tachas(overlap_porcentagem) 
  WHERE overlap_porcentagem >= 50;

CREATE INDEX IF NOT EXISTS idx_nec_cilindros_overlap 
  ON necessidades_cilindros(overlap_porcentagem) 
  WHERE overlap_porcentagem >= 50;

CREATE INDEX IF NOT EXISTS idx_nec_defensas_overlap 
  ON necessidades_defensas(overlap_porcentagem) 
  WHERE overlap_porcentagem >= 50;

-- Índices para tipo_match (filtros rápidos por método)
CREATE INDEX IF NOT EXISTS idx_nec_marcas_long_tipo_match 
  ON necessidades_marcas_longitudinais(tipo_match) 
  WHERE tipo_match IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nec_marcas_trans_tipo_match 
  ON necessidades_marcas_transversais(tipo_match) 
  WHERE tipo_match IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nec_tachas_tipo_match 
  ON necessidades_tachas(tipo_match) 
  WHERE tipo_match IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nec_cilindros_tipo_match 
  ON necessidades_cilindros(tipo_match) 
  WHERE tipo_match IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nec_defensas_tipo_match 
  ON necessidades_defensas(tipo_match) 
  WHERE tipo_match IS NOT NULL;