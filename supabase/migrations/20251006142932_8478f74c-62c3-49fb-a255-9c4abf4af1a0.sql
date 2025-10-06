-- Adicionar campo data_notificacao
ALTER TABLE public.nao_conformidades 
ADD COLUMN data_notificacao date;

COMMENT ON COLUMN public.nao_conformidades.data_notificacao IS 'Data em que a notificação foi realizada';

-- Adicionar campo para controlar se foi enviado para revisão
ALTER TABLE public.nao_conformidades 
ADD COLUMN enviado_coordenador boolean DEFAULT false;

COMMENT ON COLUMN public.nao_conformidades.enviado_coordenador IS 'Indica se a NC foi enviada para o coordenador';