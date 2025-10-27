-- ============================================================
-- MIGRATION: Adicionar colunas faltantes em tabelas de intervenções
-- Data: 2025-10-27
-- Objetivo: Permitir rastreabilidade completa (lote, rodovia, coordenadas finais)
-- ============================================================

-- 1. ficha_cilindros_intervencoes
ALTER TABLE ficha_cilindros_intervencoes
  ADD COLUMN IF NOT EXISTS latitude_final NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude_final NUMERIC;

-- 2. ficha_inscricoes_intervencoes
ALTER TABLE ficha_inscricoes_intervencoes
  ADD COLUMN IF NOT EXISTS lote_id UUID REFERENCES lotes(id),
  ADD COLUMN IF NOT EXISTS rodovia_id UUID REFERENCES rodovias(id);

-- 3. defensas_intervencoes
ALTER TABLE defensas_intervencoes
  ADD COLUMN IF NOT EXISTS lote_id UUID REFERENCES lotes(id),
  ADD COLUMN IF NOT EXISTS rodovia_id UUID REFERENCES rodovias(id),
  ADD COLUMN IF NOT EXISTS latitude_final NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude_final NUMERIC;

-- 4. ficha_tachas_intervencoes
ALTER TABLE ficha_tachas_intervencoes
  ADD COLUMN IF NOT EXISTS lote_id UUID REFERENCES lotes(id),
  ADD COLUMN IF NOT EXISTS rodovia_id UUID REFERENCES rodovias(id),
  ADD COLUMN IF NOT EXISTS latitude_final NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude_final NUMERIC;

-- 5. ficha_porticos_intervencoes
ALTER TABLE ficha_porticos_intervencoes
  ADD COLUMN IF NOT EXISTS lote_id UUID REFERENCES lotes(id),
  ADD COLUMN IF NOT EXISTS rodovia_id UUID REFERENCES rodovias(id);

-- 6. ficha_marcas_longitudinais_intervencoes
ALTER TABLE ficha_marcas_longitudinais_intervencoes
  ADD COLUMN IF NOT EXISTS lote_id UUID REFERENCES lotes(id),
  ADD COLUMN IF NOT EXISTS rodovia_id UUID REFERENCES rodovias(id);

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================