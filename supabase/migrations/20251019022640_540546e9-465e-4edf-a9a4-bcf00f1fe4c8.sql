-- Adicionar campos de aprovação do coordenador
ALTER TABLE nao_conformidades 
  ADD COLUMN IF NOT EXISTS status_aprovacao TEXT DEFAULT 'pendente' CHECK (status_aprovacao IN ('pendente', 'aprovado', 'rejeitado')),
  ADD COLUMN IF NOT EXISTS observacao_coordenador TEXT,
  ADD COLUMN IF NOT EXISTS aprovado_por UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS data_aprovacao TIMESTAMP WITH TIME ZONE;

-- Criar índice para consultas por status de aprovação
CREATE INDEX IF NOT EXISTS idx_nao_conformidades_status_aprovacao ON nao_conformidades(status_aprovacao);

-- Criar índice para consultas por coordenador aprovador
CREATE INDEX IF NOT EXISTS idx_nao_conformidades_aprovado_por ON nao_conformidades(aprovado_por);

-- Comentários para documentação
COMMENT ON COLUMN nao_conformidades.status_aprovacao IS 'Status de aprovação: pendente (aguardando aprovação), aprovado (coordenador aprovou), rejeitado (coordenador rejeitou)';
COMMENT ON COLUMN nao_conformidades.observacao_coordenador IS 'Observações do coordenador sobre a NC (motivo de rejeição ou comentários)';
COMMENT ON COLUMN nao_conformidades.aprovado_por IS 'Coordenador que aprovou ou rejeitou a NC';
COMMENT ON COLUMN nao_conformidades.data_aprovacao IS 'Data e hora em que o coordenador aprovou ou rejeitou a NC';