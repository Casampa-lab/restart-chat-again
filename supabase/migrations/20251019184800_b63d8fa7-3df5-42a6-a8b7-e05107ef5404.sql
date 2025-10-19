-- Migration: Adicionar distancia_match_metros às tabelas de necessidades
-- Data: 2025-01-19
-- Motivo: Suportar auditoria de qualidade do matching GPS universal (RecalcularMatches.tsx)

-- Adicionar coluna em todas as 7 tabelas
ALTER TABLE necessidades_marcas_longitudinais
ADD COLUMN IF NOT EXISTS distancia_match_metros NUMERIC;

ALTER TABLE necessidades_marcas_transversais
ADD COLUMN IF NOT EXISTS distancia_match_metros NUMERIC;

ALTER TABLE necessidades_tachas
ADD COLUMN IF NOT EXISTS distancia_match_metros NUMERIC;

ALTER TABLE necessidades_cilindros
ADD COLUMN IF NOT EXISTS distancia_match_metros NUMERIC;

ALTER TABLE necessidades_defensas
ADD COLUMN IF NOT EXISTS distancia_match_metros NUMERIC;

ALTER TABLE necessidades_porticos
ADD COLUMN IF NOT EXISTS distancia_match_metros NUMERIC;

ALTER TABLE necessidades_placas
ADD COLUMN IF NOT EXISTS distancia_match_metros NUMERIC;

-- Adicionar comentários explicativos para documentação
COMMENT ON COLUMN necessidades_marcas_longitudinais.distancia_match_metros IS 
  'Distância GPS em metros entre coordenada da necessidade e cadastro encontrado. NULL = sem match ou matching não-GPS (por km/snv).';

COMMENT ON COLUMN necessidades_marcas_transversais.distancia_match_metros IS 
  'Distância GPS em metros entre coordenada da necessidade e cadastro encontrado. NULL = sem match ou matching não-GPS (por km/snv).';

COMMENT ON COLUMN necessidades_tachas.distancia_match_metros IS 
  'Distância GPS em metros entre coordenada da necessidade e cadastro encontrado. NULL = sem match ou matching não-GPS (por km/snv).';

COMMENT ON COLUMN necessidades_cilindros.distancia_match_metros IS 
  'Distância GPS em metros entre coordenada da necessidade e cadastro encontrado. NULL = sem match ou matching não-GPS (por km/snv).';

COMMENT ON COLUMN necessidades_defensas.distancia_match_metros IS 
  'Distância GPS em metros entre coordenada da necessidade e cadastro encontrado. NULL = sem match ou matching não-GPS (por km/snv).';

COMMENT ON COLUMN necessidades_porticos.distancia_match_metros IS 
  'Distância GPS em metros entre coordenada da necessidade e cadastro encontrado. NULL = sem match ou matching não-GPS (por km/snv).';

COMMENT ON COLUMN necessidades_placas.distancia_match_metros IS 
  'Distância GPS em metros entre coordenada da necessidade e cadastro encontrado. NULL = sem match ou matching não-GPS (por km/snv).';

-- Criar índices parciais para performance (apenas onde distancia existe)
CREATE INDEX IF NOT EXISTS idx_nec_marcas_long_distancia 
  ON necessidades_marcas_longitudinais(distancia_match_metros) 
  WHERE distancia_match_metros IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nec_marcas_trans_distancia 
  ON necessidades_marcas_transversais(distancia_match_metros) 
  WHERE distancia_match_metros IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nec_tachas_distancia 
  ON necessidades_tachas(distancia_match_metros) 
  WHERE distancia_match_metros IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nec_cilindros_distancia 
  ON necessidades_cilindros(distancia_match_metros) 
  WHERE distancia_match_metros IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nec_defensas_distancia 
  ON necessidades_defensas(distancia_match_metros) 
  WHERE distancia_match_metros IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nec_porticos_distancia 
  ON necessidades_porticos(distancia_match_metros) 
  WHERE distancia_match_metros IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nec_placas_distancia 
  ON necessidades_placas(distancia_match_metros) 
  WHERE distancia_match_metros IS NOT NULL;