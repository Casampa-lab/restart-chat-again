-- Adicionar campo extensao_total_km na tabela lotes
ALTER TABLE lotes ADD COLUMN IF NOT EXISTS extensao_total_km NUMERIC;

-- Adicionar campos SNV, KM, extensão e coordenadas na tabela lotes_rodovias
ALTER TABLE lotes_rodovias 
  ADD COLUMN IF NOT EXISTS snv_inicial TEXT,
  ADD COLUMN IF NOT EXISTS snv_final TEXT,
  ADD COLUMN IF NOT EXISTS km_inicial NUMERIC,
  ADD COLUMN IF NOT EXISTS km_final NUMERIC,
  ADD COLUMN IF NOT EXISTS extensao_km NUMERIC,
  ADD COLUMN IF NOT EXISTS latitude_inicial NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude_inicial NUMERIC,
  ADD COLUMN IF NOT EXISTS latitude_final NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude_final NUMERIC;