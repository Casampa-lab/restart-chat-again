-- Adicionar colunas de reconciliação para necessidades_placas
ALTER TABLE public.necessidades_placas 
ADD COLUMN IF NOT EXISTS observacao_reconciliacao TEXT,
ADD COLUMN IF NOT EXISTS rejeitado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejeitado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS observacao_coordenador TEXT,
ADD COLUMN IF NOT EXISTS observacao_usuario TEXT,
ADD COLUMN IF NOT EXISTS solicitado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS solicitado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS aprovado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMPTZ;

-- Comentários para documentação
COMMENT ON COLUMN public.necessidades_placas.observacao_reconciliacao IS 'Observação ao rejeitar uma reconciliação';
COMMENT ON COLUMN public.necessidades_placas.rejeitado_por IS 'Usuário que rejeitou a reconciliação';
COMMENT ON COLUMN public.necessidades_placas.rejeitado_em IS 'Data/hora da rejeição';
COMMENT ON COLUMN public.necessidades_placas.observacao_coordenador IS 'Observação do coordenador ao aprovar';
COMMENT ON COLUMN public.necessidades_placas.observacao_usuario IS 'Observação do usuário ao solicitar aprovação';
COMMENT ON COLUMN public.necessidades_placas.solicitado_por IS 'Usuário que solicitou a aprovação';
COMMENT ON COLUMN public.necessidades_placas.solicitado_em IS 'Data/hora da solicitação';
COMMENT ON COLUMN public.necessidades_placas.aprovado_por IS 'Usuário que aprovou';
COMMENT ON COLUMN public.necessidades_placas.aprovado_em IS 'Data/hora da aprovação';