-- Migration: Adicionar colunas de matching nas tabelas de necessidades
-- Justificativa: Sistema de matching manual requer armazenamento de decisões

-- Criar tipo ENUM para match_decision
DO $$ BEGIN
  CREATE TYPE match_decision_enum AS ENUM ('MATCH_DIRECT', 'SUBSTITUICAO', 'AMBIGUOUS', 'NO_MATCH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Adicionar colunas em necessidades_cilindros
ALTER TABLE necessidades_cilindros
  ADD COLUMN IF NOT EXISTS match_decision match_decision_enum,
  ADD COLUMN IF NOT EXISTS match_score NUMERIC(4,3) CHECK (match_score >= 0 AND match_score <= 1),
  ADD COLUMN IF NOT EXISTS reason_code TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'PROPOSTO' CHECK (estado IN ('ATIVO', 'PROPOSTO', 'REJEITADO'));

-- Adicionar colunas em necessidades_defensas
ALTER TABLE necessidades_defensas
  ADD COLUMN IF NOT EXISTS match_decision match_decision_enum,
  ADD COLUMN IF NOT EXISTS match_score NUMERIC(4,3) CHECK (match_score >= 0 AND match_score <= 1),
  ADD COLUMN IF NOT EXISTS reason_code TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'PROPOSTO' CHECK (estado IN ('ATIVO', 'PROPOSTO', 'REJEITADO'));

-- Adicionar colunas em necessidades_marcas_longitudinais
ALTER TABLE necessidades_marcas_longitudinais
  ADD COLUMN IF NOT EXISTS match_decision match_decision_enum,
  ADD COLUMN IF NOT EXISTS match_score NUMERIC(4,3) CHECK (match_score >= 0 AND match_score <= 1),
  ADD COLUMN IF NOT EXISTS reason_code TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'PROPOSTO' CHECK (estado IN ('ATIVO', 'PROPOSTO', 'REJEITADO'));

-- Adicionar colunas em necessidades_marcas_transversais
ALTER TABLE necessidades_marcas_transversais
  ADD COLUMN IF NOT EXISTS match_decision match_decision_enum,
  ADD COLUMN IF NOT EXISTS match_score NUMERIC(4,3) CHECK (match_score >= 0 AND match_score <= 1),
  ADD COLUMN IF NOT EXISTS reason_code TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'PROPOSTO' CHECK (estado IN ('ATIVO', 'PROPOSTO', 'REJEITADO'));

-- Adicionar colunas em necessidades_placas
ALTER TABLE necessidades_placas
  ADD COLUMN IF NOT EXISTS match_decision match_decision_enum,
  ADD COLUMN IF NOT EXISTS match_score NUMERIC(4,3) CHECK (match_score >= 0 AND match_score <= 1),
  ADD COLUMN IF NOT EXISTS reason_code TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'PROPOSTO' CHECK (estado IN ('ATIVO', 'PROPOSTO', 'REJEITADO'));

-- Adicionar colunas em necessidades_porticos
ALTER TABLE necessidades_porticos
  ADD COLUMN IF NOT EXISTS match_decision match_decision_enum,
  ADD COLUMN IF NOT EXISTS match_score NUMERIC(4,3) CHECK (match_score >= 0 AND match_score <= 1),
  ADD COLUMN IF NOT EXISTS reason_code TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'PROPOSTO' CHECK (estado IN ('ATIVO', 'PROPOSTO', 'REJEITADO'));

-- Adicionar colunas em necessidades_tachas
ALTER TABLE necessidades_tachas
  ADD COLUMN IF NOT EXISTS match_decision match_decision_enum,
  ADD COLUMN IF NOT EXISTS match_score NUMERIC(4,3) CHECK (match_score >= 0 AND match_score <= 1),
  ADD COLUMN IF NOT EXISTS reason_code TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'PROPOSTO' CHECK (estado IN ('ATIVO', 'PROPOSTO', 'REJEITADO'));

-- Comentários explicativos
COMMENT ON COLUMN necessidades_cilindros.match_decision IS 'Decisão do algoritmo de matching: MATCH_DIRECT, SUBSTITUICAO, AMBIGUOUS, NO_MATCH';
COMMENT ON COLUMN necessidades_cilindros.match_score IS 'Score do matching (0-1), sendo 1 = match perfeito';
COMMENT ON COLUMN necessidades_cilindros.reason_code IS 'Código de motivo da decisão de matching';
COMMENT ON COLUMN necessidades_cilindros.estado IS 'Estado da necessidade: ATIVO (conclusivo), PROPOSTO (aguardando aprovação), REJEITADO';

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_necessidades_cilindros_match_decision ON necessidades_cilindros(match_decision);
CREATE INDEX IF NOT EXISTS idx_necessidades_cilindros_estado ON necessidades_cilindros(estado);
CREATE INDEX IF NOT EXISTS idx_necessidades_defensas_match_decision ON necessidades_defensas(match_decision);
CREATE INDEX IF NOT EXISTS idx_necessidades_defensas_estado ON necessidades_defensas(estado);
CREATE INDEX IF NOT EXISTS idx_necessidades_marcas_long_match_decision ON necessidades_marcas_longitudinais(match_decision);
CREATE INDEX IF NOT EXISTS idx_necessidades_marcas_long_estado ON necessidades_marcas_longitudinais(estado);
CREATE INDEX IF NOT EXISTS idx_necessidades_marcas_trans_match_decision ON necessidades_marcas_transversais(match_decision);
CREATE INDEX IF NOT EXISTS idx_necessidades_marcas_trans_estado ON necessidades_marcas_transversais(estado);
CREATE INDEX IF NOT EXISTS idx_necessidades_placas_match_decision ON necessidades_placas(match_decision);
CREATE INDEX IF NOT EXISTS idx_necessidades_placas_estado ON necessidades_placas(estado);
CREATE INDEX IF NOT EXISTS idx_necessidades_porticos_match_decision ON necessidades_porticos(match_decision);
CREATE INDEX IF NOT EXISTS idx_necessidades_porticos_estado ON necessidades_porticos(estado);
CREATE INDEX IF NOT EXISTS idx_necessidades_tachas_match_decision ON necessidades_tachas(match_decision);
CREATE INDEX IF NOT EXISTS idx_necessidades_tachas_estado ON necessidades_tachas(estado);