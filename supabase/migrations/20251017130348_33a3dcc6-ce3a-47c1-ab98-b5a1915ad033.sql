-- Adicionar colunas de tolerância específicas por tipo de elemento na tabela rodovias
ALTER TABLE rodovias 
  ADD COLUMN IF NOT EXISTS tolerancia_placas_metros INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS tolerancia_porticos_metros INTEGER DEFAULT 200,
  ADD COLUMN IF NOT EXISTS tolerancia_defensas_metros INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS tolerancia_marcas_metros INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS tolerancia_cilindros_metros INTEGER DEFAULT 25,
  ADD COLUMN IF NOT EXISTS tolerancia_tachas_metros INTEGER DEFAULT 25,
  ADD COLUMN IF NOT EXISTS tolerancia_inscricoes_metros INTEGER DEFAULT 30;

-- Atualizar rodovias existentes com os valores padrão confirmados
UPDATE rodovias 
SET 
  tolerancia_placas_metros = COALESCE(tolerancia_placas_metros, 50),
  tolerancia_porticos_metros = COALESCE(tolerancia_porticos_metros, 200),
  tolerancia_defensas_metros = COALESCE(tolerancia_defensas_metros, 20),
  tolerancia_marcas_metros = COALESCE(tolerancia_marcas_metros, 20),
  tolerancia_cilindros_metros = COALESCE(tolerancia_cilindros_metros, 25),
  tolerancia_tachas_metros = COALESCE(tolerancia_tachas_metros, 25),
  tolerancia_inscricoes_metros = COALESCE(tolerancia_inscricoes_metros, 30);

-- Adicionar comentário na coluna genérica para documentar que é fallback
COMMENT ON COLUMN rodovias.tolerancia_match_metros IS 'Tolerância GPS genérica (fallback). Priorizar uso das colunas específicas por tipo de elemento quando disponíveis.';