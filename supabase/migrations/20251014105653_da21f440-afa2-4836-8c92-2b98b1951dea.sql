-- Adicionar campos para sistema de reconciliação na tabela necessidades_placas
ALTER TABLE public.necessidades_placas 
  ADD COLUMN IF NOT EXISTS servico_inferido text,
  ADD COLUMN IF NOT EXISTS servico_final text,
  ADD COLUMN IF NOT EXISTS divergencia boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconciliado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconciliado_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS data_reconciliacao timestamp with time zone,
  ADD COLUMN IF NOT EXISTS justificativa_reconciliacao text;

-- Comentários para documentação
COMMENT ON COLUMN public.necessidades_placas.servico_inferido IS 'Serviço identificado automaticamente pelo sistema baseado em match GPS';
COMMENT ON COLUMN public.necessidades_placas.servico_final IS 'Serviço definitivo após reconciliação (padrão: solucao_planilha)';
COMMENT ON COLUMN public.necessidades_placas.divergencia IS 'Indica se há divergência entre solucao_planilha e servico_inferido';
COMMENT ON COLUMN public.necessidades_placas.reconciliado IS 'Indica se a divergência foi reconciliada por um usuário';
COMMENT ON COLUMN public.necessidades_placas.reconciliado_por IS 'Usuário que realizou a reconciliação';
COMMENT ON COLUMN public.necessidades_placas.data_reconciliacao IS 'Data e hora da reconciliação';
COMMENT ON COLUMN public.necessidades_placas.justificativa_reconciliacao IS 'Justificativa quando escolher servico diferente do projeto';

-- Índices para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_necessidades_placas_divergencia ON public.necessidades_placas(divergencia) WHERE divergencia = true;
CREATE INDEX IF NOT EXISTS idx_necessidades_placas_reconciliado ON public.necessidades_placas(reconciliado) WHERE reconciliado = false;
CREATE INDEX IF NOT EXISTS idx_necessidades_placas_servico_final ON public.necessidades_placas(servico_final);

-- Atualizar registros existentes: servico_final = servico atual, servico_inferido = servico atual
UPDATE public.necessidades_placas 
SET 
  servico_inferido = servico,
  servico_final = COALESCE(solucao_planilha, servico),
  divergencia = CASE 
    WHEN solucao_planilha IS NOT NULL AND LOWER(solucao_planilha) != LOWER(servico) THEN true
    ELSE false
  END,
  reconciliado = false
WHERE servico_inferido IS NULL;