-- Adicionar coluna match_at em todas as tabelas de necessidades
ALTER TABLE necessidades_cilindros 
  ADD COLUMN IF NOT EXISTS match_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE necessidades_defensas 
  ADD COLUMN IF NOT EXISTS match_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE necessidades_marcas_longitudinais 
  ADD COLUMN IF NOT EXISTS match_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE necessidades_marcas_transversais 
  ADD COLUMN IF NOT EXISTS match_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE necessidades_placas 
  ADD COLUMN IF NOT EXISTS match_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE necessidades_porticos 
  ADD COLUMN IF NOT EXISTS match_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE necessidades_tachas 
  ADD COLUMN IF NOT EXISTS match_at TIMESTAMPTZ DEFAULT NULL;

-- Adicionar comentários para documentação
COMMENT ON COLUMN necessidades_cilindros.match_at IS 'Timestamp de quando o matching automático foi executado pela última vez';
COMMENT ON COLUMN necessidades_defensas.match_at IS 'Timestamp de quando o matching automático foi executado pela última vez';
COMMENT ON COLUMN necessidades_marcas_longitudinais.match_at IS 'Timestamp de quando o matching automático foi executado pela última vez';
COMMENT ON COLUMN necessidades_marcas_transversais.match_at IS 'Timestamp de quando o matching automático foi executado pela última vez';
COMMENT ON COLUMN necessidades_placas.match_at IS 'Timestamp de quando o matching automático foi executado pela última vez';
COMMENT ON COLUMN necessidades_porticos.match_at IS 'Timestamp de quando o matching automático foi executado pela última vez';
COMMENT ON COLUMN necessidades_tachas.match_at IS 'Timestamp de quando o matching automático foi executado pela última vez';