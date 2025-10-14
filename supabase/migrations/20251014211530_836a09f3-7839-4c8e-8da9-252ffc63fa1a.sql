-- Adicionar campos para workflow de reconciliação de necessidades de placas
ALTER TABLE public.necessidades_placas
ADD COLUMN IF NOT EXISTS status_reconciliacao TEXT 
  CHECK (status_reconciliacao IN ('pendente_aprovacao', 'aprovado', 'rejeitado')),
ADD COLUMN IF NOT EXISTS solicitado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS solicitado_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS observacao_usuario TEXT,
ADD COLUMN IF NOT EXISTS aprovado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS observacao_coordenador TEXT;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_necessidades_placas_status_reconciliacao 
ON public.necessidades_placas(status_reconciliacao) 
WHERE status_reconciliacao = 'pendente_aprovacao';

-- Comentários
COMMENT ON COLUMN public.necessidades_placas.status_reconciliacao 
  IS 'Status do fluxo de reconciliação: pendente_aprovacao | aprovado | rejeitado';
COMMENT ON COLUMN public.necessidades_placas.solicitado_por 
  IS 'Usuário de campo que solicitou a reconciliação';
COMMENT ON COLUMN public.necessidades_placas.observacao_usuario 
  IS 'Observação do usuário de campo ao solicitar reconciliação';
COMMENT ON COLUMN public.necessidades_placas.aprovado_por 
  IS 'Coordenador que aprovou/rejeitou a reconciliação';
COMMENT ON COLUMN public.necessidades_placas.observacao_coordenador 
  IS 'Observação do coordenador ao decidir sobre a reconciliação';