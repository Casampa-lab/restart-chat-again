-- Adicionar colunas para sistema de match por sobreposição em elementos lineares

-- Tabela: necessidades_marcas_longitudinais
ALTER TABLE necessidades_marcas_longitudinais 
  ADD COLUMN IF NOT EXISTS overlap_porcentagem NUMERIC,
  ADD COLUMN IF NOT EXISTS tipo_match TEXT,
  ADD COLUMN IF NOT EXISTS status_revisao TEXT DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS motivo_revisao TEXT;

-- Adicionar constraints para tipo_match
ALTER TABLE necessidades_marcas_longitudinais
  DROP CONSTRAINT IF EXISTS check_tipo_match_marcas,
  ADD CONSTRAINT check_tipo_match_marcas 
    CHECK (tipo_match IS NULL OR tipo_match IN ('exato', 'alto', 'parcial'));

-- Adicionar constraints para status_revisao  
ALTER TABLE necessidades_marcas_longitudinais
  DROP CONSTRAINT IF EXISTS check_status_revisao_marcas,
  ADD CONSTRAINT check_status_revisao_marcas 
    CHECK (status_revisao IN ('ok', 'pendente_coordenador'));

-- Tabela: necessidades_tachas
ALTER TABLE necessidades_tachas 
  ADD COLUMN IF NOT EXISTS overlap_porcentagem NUMERIC,
  ADD COLUMN IF NOT EXISTS tipo_match TEXT,
  ADD COLUMN IF NOT EXISTS status_revisao TEXT DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS motivo_revisao TEXT;

-- Adicionar constraints para tipo_match
ALTER TABLE necessidades_tachas
  DROP CONSTRAINT IF EXISTS check_tipo_match_tachas,
  ADD CONSTRAINT check_tipo_match_tachas 
    CHECK (tipo_match IS NULL OR tipo_match IN ('exato', 'alto', 'parcial'));

-- Adicionar constraints para status_revisao
ALTER TABLE necessidades_tachas
  DROP CONSTRAINT IF EXISTS check_status_revisao_tachas,
  ADD CONSTRAINT check_status_revisao_tachas 
    CHECK (status_revisao IN ('ok', 'pendente_coordenador'));

-- Tabela: necessidades_defensas
ALTER TABLE necessidades_defensas 
  ADD COLUMN IF NOT EXISTS overlap_porcentagem NUMERIC,
  ADD COLUMN IF NOT EXISTS tipo_match TEXT,
  ADD COLUMN IF NOT EXISTS status_revisao TEXT DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS motivo_revisao TEXT;

-- Adicionar constraints para tipo_match
ALTER TABLE necessidades_defensas
  DROP CONSTRAINT IF EXISTS check_tipo_match_defensas,
  ADD CONSTRAINT check_tipo_match_defensas 
    CHECK (tipo_match IS NULL OR tipo_match IN ('exato', 'alto', 'parcial'));

-- Adicionar constraints para status_revisao
ALTER TABLE necessidades_defensas
  DROP CONSTRAINT IF EXISTS check_status_revisao_defensas,
  ADD CONSTRAINT check_status_revisao_defensas 
    CHECK (status_revisao IN ('ok', 'pendente_coordenador'));

-- Comentários explicativos
COMMENT ON COLUMN necessidades_marcas_longitudinais.overlap_porcentagem IS 'Porcentagem de sobreposição entre segmento da necessidade e cadastro (0-100%)';
COMMENT ON COLUMN necessidades_marcas_longitudinais.tipo_match IS 'Classificação do match: exato (≥95%), alto (≥75%), parcial (50-75%)';
COMMENT ON COLUMN necessidades_marcas_longitudinais.status_revisao IS 'Status de revisão: ok (aprovado) ou pendente_coordenador (requer revisão manual)';
COMMENT ON COLUMN necessidades_marcas_longitudinais.motivo_revisao IS 'Motivo pelo qual está pendente de revisão';

COMMENT ON COLUMN necessidades_tachas.overlap_porcentagem IS 'Porcentagem de sobreposição entre segmento da necessidade e cadastro (0-100%)';
COMMENT ON COLUMN necessidades_tachas.tipo_match IS 'Classificação do match: exato (≥95%), alto (≥75%), parcial (50-75%)';
COMMENT ON COLUMN necessidades_tachas.status_revisao IS 'Status de revisão: ok (aprovado) ou pendente_coordenador (requer revisão manual)';
COMMENT ON COLUMN necessidades_tachas.motivo_revisao IS 'Motivo pelo qual está pendente de revisão';

COMMENT ON COLUMN necessidades_defensas.overlap_porcentagem IS 'Porcentagem de sobreposição entre segmento da necessidade e cadastro (0-100%)';
COMMENT ON COLUMN necessidades_defensas.tipo_match IS 'Classificação do match: exato (≥95%), alto (≥75%), parcial (50-75%)';
COMMENT ON COLUMN necessidades_defensas.status_revisao IS 'Status de revisão: ok (aprovado) ou pendente_coordenador (requer revisão manual)';
COMMENT ON COLUMN necessidades_defensas.motivo_revisao IS 'Motivo pelo qual está pendente de revisão';