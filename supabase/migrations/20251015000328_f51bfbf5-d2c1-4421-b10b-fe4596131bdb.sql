
-- Adicionar campos de reconciliação em TODAS as tabelas de necessidades

-- 1. DEFENSAS
ALTER TABLE necessidades_defensas
ADD COLUMN IF NOT EXISTS servico_inferido TEXT,
ADD COLUMN IF NOT EXISTS servico_final TEXT,
ADD COLUMN IF NOT EXISTS divergencia BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reconciliado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reconciliado_por UUID,
ADD COLUMN IF NOT EXISTS data_reconciliacao TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS justificativa_reconciliacao TEXT,
ADD COLUMN IF NOT EXISTS status_reconciliacao TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS solicitado_por UUID,
ADD COLUMN IF NOT EXISTS solicitado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS aprovado_por UUID,
ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS observacao_usuario TEXT,
ADD COLUMN IF NOT EXISTS observacao_coordenador TEXT,
ADD COLUMN IF NOT EXISTS localizado_em_campo BOOLEAN DEFAULT FALSE;

-- 2. CILINDROS
ALTER TABLE necessidades_cilindros
ADD COLUMN IF NOT EXISTS servico_inferido TEXT,
ADD COLUMN IF NOT EXISTS servico_final TEXT,
ADD COLUMN IF NOT EXISTS divergencia BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reconciliado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reconciliado_por UUID,
ADD COLUMN IF NOT EXISTS data_reconciliacao TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS justificativa_reconciliacao TEXT,
ADD COLUMN IF NOT EXISTS status_reconciliacao TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS solicitado_por UUID,
ADD COLUMN IF NOT EXISTS solicitado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS aprovado_por UUID,
ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS observacao_usuario TEXT,
ADD COLUMN IF NOT EXISTS observacao_coordenador TEXT,
ADD COLUMN IF NOT EXISTS localizado_em_campo BOOLEAN DEFAULT FALSE;

-- 3. MARCAS LONGITUDINAIS
ALTER TABLE necessidades_marcas_longitudinais
ADD COLUMN IF NOT EXISTS servico_inferido TEXT,
ADD COLUMN IF NOT EXISTS servico_final TEXT,
ADD COLUMN IF NOT EXISTS divergencia BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reconciliado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reconciliado_por UUID,
ADD COLUMN IF NOT EXISTS data_reconciliacao TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS justificativa_reconciliacao TEXT,
ADD COLUMN IF NOT EXISTS status_reconciliacao TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS solicitado_por UUID,
ADD COLUMN IF NOT EXISTS solicitado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS aprovado_por UUID,
ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS observacao_usuario TEXT,
ADD COLUMN IF NOT EXISTS observacao_coordenador TEXT,
ADD COLUMN IF NOT EXISTS localizado_em_campo BOOLEAN DEFAULT FALSE;

-- 4. MARCAS TRANSVERSAIS (INSCRIÇÕES)
ALTER TABLE necessidades_marcas_transversais
ADD COLUMN IF NOT EXISTS servico_inferido TEXT,
ADD COLUMN IF NOT EXISTS servico_final TEXT,
ADD COLUMN IF NOT EXISTS divergencia BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reconciliado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reconciliado_por UUID,
ADD COLUMN IF NOT EXISTS data_reconciliacao TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS justificativa_reconciliacao TEXT,
ADD COLUMN IF NOT EXISTS status_reconciliacao TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS solicitado_por UUID,
ADD COLUMN IF NOT EXISTS solicitado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS aprovado_por UUID,
ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS observacao_usuario TEXT,
ADD COLUMN IF NOT EXISTS observacao_coordenador TEXT,
ADD COLUMN IF NOT EXISTS localizado_em_campo BOOLEAN DEFAULT FALSE;

-- 5. PÓRTICOS
ALTER TABLE necessidades_porticos
ADD COLUMN IF NOT EXISTS servico_inferido TEXT,
ADD COLUMN IF NOT EXISTS servico_final TEXT,
ADD COLUMN IF NOT EXISTS divergencia BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reconciliado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reconciliado_por UUID,
ADD COLUMN IF NOT EXISTS data_reconciliacao TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS justificativa_reconciliacao TEXT,
ADD COLUMN IF NOT EXISTS status_reconciliacao TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS solicitado_por UUID,
ADD COLUMN IF NOT EXISTS solicitado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS aprovado_por UUID,
ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS observacao_usuario TEXT,
ADD COLUMN IF NOT EXISTS observacao_coordenador TEXT,
ADD COLUMN IF NOT EXISTS localizado_em_campo BOOLEAN DEFAULT FALSE;

-- 6. TACHAS
ALTER TABLE necessidades_tachas
ADD COLUMN IF NOT EXISTS servico_inferido TEXT,
ADD COLUMN IF NOT EXISTS servico_final TEXT,
ADD COLUMN IF NOT EXISTS divergencia BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reconciliado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reconciliado_por UUID,
ADD COLUMN IF NOT EXISTS data_reconciliacao TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS justificativa_reconciliacao TEXT,
ADD COLUMN IF NOT EXISTS status_reconciliacao TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS solicitado_por UUID,
ADD COLUMN IF NOT EXISTS solicitado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS aprovado_por UUID,
ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS observacao_usuario TEXT,
ADD COLUMN IF NOT EXISTS observacao_coordenador TEXT,
ADD COLUMN IF NOT EXISTS localizado_em_campo BOOLEAN DEFAULT FALSE;

-- 7. PLACAS (já tem alguns campos, adicionar os faltantes)
ALTER TABLE necessidades_placas
ADD COLUMN IF NOT EXISTS servico_inferido TEXT,
ADD COLUMN IF NOT EXISTS servico_final TEXT,
ADD COLUMN IF NOT EXISTS divergencia BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reconciliado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reconciliado_por UUID,
ADD COLUMN IF NOT EXISTS data_reconciliacao TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS justificativa_reconciliacao TEXT,
ADD COLUMN IF NOT EXISTS status_reconciliacao TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS solicitado_por UUID,
ADD COLUMN IF NOT EXISTS solicitado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS aprovado_por UUID,
ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS observacao_usuario TEXT,
ADD COLUMN IF NOT EXISTS observacao_coordenador TEXT,
ADD COLUMN IF NOT EXISTS localizado_em_campo BOOLEAN DEFAULT FALSE;

-- Criar índices para melhor performance nas consultas de reconciliação
CREATE INDEX IF NOT EXISTS idx_necessidades_defensas_reconciliacao ON necessidades_defensas(divergencia, reconciliado);
CREATE INDEX IF NOT EXISTS idx_necessidades_cilindros_reconciliacao ON necessidades_cilindros(divergencia, reconciliado);
CREATE INDEX IF NOT EXISTS idx_necessidades_marcas_longitudinais_reconciliacao ON necessidades_marcas_longitudinais(divergencia, reconciliado);
CREATE INDEX IF NOT EXISTS idx_necessidades_marcas_transversais_reconciliacao ON necessidades_marcas_transversais(divergencia, reconciliado);
CREATE INDEX IF NOT EXISTS idx_necessidades_porticos_reconciliacao ON necessidades_porticos(divergencia, reconciliado);
CREATE INDEX IF NOT EXISTS idx_necessidades_tachas_reconciliacao ON necessidades_tachas(divergencia, reconciliado);
CREATE INDEX IF NOT EXISTS idx_necessidades_placas_reconciliacao ON necessidades_placas(divergencia, reconciliado);

COMMENT ON COLUMN necessidades_defensas.servico_inferido IS 'Serviço inferido automaticamente pelo sistema baseado em GPS e regras';
COMMENT ON COLUMN necessidades_defensas.servico_final IS 'Serviço final decidido após reconciliação (prevalece sobre servico)';
COMMENT ON COLUMN necessidades_defensas.divergencia IS 'TRUE quando servico_planilha difere de servico_inferido';
COMMENT ON COLUMN necessidades_defensas.reconciliado IS 'TRUE quando divergência foi resolvida pelo coordenador';
COMMENT ON COLUMN necessidades_defensas.status_reconciliacao IS 'Estado: pendente, pendente_aprovacao, aprovado, rejeitado';