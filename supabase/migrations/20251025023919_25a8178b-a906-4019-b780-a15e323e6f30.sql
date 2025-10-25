-- Adicionar colunas lote_id e rodovia_id à tabela ficha_placa_intervencoes
ALTER TABLE public.ficha_placa_intervencoes
ADD COLUMN IF NOT EXISTS lote_id UUID REFERENCES public.lotes(id),
ADD COLUMN IF NOT EXISTS rodovia_id UUID REFERENCES public.rodovias(id);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_ficha_placa_intervencoes_lote_id 
ON public.ficha_placa_intervencoes(lote_id);

CREATE INDEX IF NOT EXISTS idx_ficha_placa_intervencoes_rodovia_id 
ON public.ficha_placa_intervencoes(rodovia_id);