-- Adicionar colunas de reconciliação e auditoria em necessidades_porticos
ALTER TABLE necessidades_porticos 
  ADD COLUMN IF NOT EXISTS divergencia BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reconciliado BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS servico_final TEXT,
  ADD COLUMN IF NOT EXISTS servico_inferido TEXT,
  ADD COLUMN IF NOT EXISTS revisao_solicitada BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS localizado_em_campo BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS data_reconciliacao TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reconciliado_por UUID REFERENCES auth.users(id);

-- Comentários explicativos
COMMENT ON COLUMN necessidades_porticos.divergencia 
  IS 'TRUE quando serviço da planilha difere do inferido pelo sistema';

COMMENT ON COLUMN necessidades_porticos.reconciliado 
  IS 'TRUE quando divergência foi resolvida in-loco';

COMMENT ON COLUMN necessidades_porticos.servico_final 
  IS 'Serviço após reconciliação (sobrescreve servico e servico_inferido)';

COMMENT ON COLUMN necessidades_porticos.servico_inferido 
  IS 'Serviço inferido automaticamente pelo sistema GPS';

COMMENT ON COLUMN necessidades_porticos.revisao_solicitada 
  IS 'TRUE quando equipe solicitou revisão desta necessidade';

COMMENT ON COLUMN necessidades_porticos.localizado_em_campo 
  IS 'TRUE quando elemento foi encontrado fisicamente in-loco';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_necessidades_porticos_divergencia 
  ON necessidades_porticos(divergencia) WHERE divergencia = TRUE;

CREATE INDEX IF NOT EXISTS idx_necessidades_porticos_reconciliado 
  ON necessidades_porticos(reconciliado) WHERE reconciliado = FALSE;

CREATE INDEX IF NOT EXISTS idx_necessidades_porticos_cadastro_match 
  ON necessidades_porticos(cadastro_id, distancia_match_metros) 
  WHERE cadastro_id IS NOT NULL;