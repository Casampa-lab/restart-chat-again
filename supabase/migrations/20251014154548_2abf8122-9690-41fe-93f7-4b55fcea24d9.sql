-- Adicionar tolerância configurável às rodovias e lotes
ALTER TABLE public.rodovias 
ADD COLUMN IF NOT EXISTS tolerancia_match_metros integer DEFAULT 50;

ALTER TABLE public.lotes 
ADD COLUMN IF NOT EXISTS tolerancia_match_metros integer;

COMMENT ON COLUMN public.rodovias.tolerancia_match_metros IS 'Tolerância padrão em metros para match GPS';
COMMENT ON COLUMN public.lotes.tolerancia_match_metros IS 'Tolerância específica do lote (override da rodovia)';

-- Adicionar campos de reconciliação em campo
ALTER TABLE public.necessidades_placas
ADD COLUMN IF NOT EXISTS revisao_solicitada boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS revisao_solicitada_por uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS revisao_observacao text,
ADD COLUMN IF NOT EXISTS localizado_em_campo boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reconciliado_por uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reconciliado_em timestamp with time zone;

COMMENT ON COLUMN public.necessidades_placas.revisao_solicitada IS 'Usuário de campo solicitou revisão do coordenador';
COMMENT ON COLUMN public.necessidades_placas.localizado_em_campo IS 'Confirmação visual no local pelo usuário';
COMMENT ON COLUMN public.necessidades_placas.reconciliado_por IS 'Usuário que fez a reconciliação';
COMMENT ON COLUMN public.necessidades_placas.reconciliado_em IS 'Data/hora da reconciliação';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_necessidades_placas_divergencia 
ON public.necessidades_placas(divergencia) 
WHERE divergencia = true;

CREATE INDEX IF NOT EXISTS idx_necessidades_placas_reconciliado 
ON public.necessidades_placas(reconciliado) 
WHERE reconciliado = false;

CREATE INDEX IF NOT EXISTS idx_necessidades_placas_revisao 
ON public.necessidades_placas(revisao_solicitada) 
WHERE revisao_solicitada = true;