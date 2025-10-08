-- Adicionar campos para separar Sinalização Horizontal e Vertical
ALTER TABLE public.retrorrefletividade_estatica
ADD COLUMN IF NOT EXISTS tipo_sinalizacao TEXT,
ADD COLUMN IF NOT EXISTS posicao_horizontal TEXT,
ADD COLUMN IF NOT EXISTS cor_horizontal TEXT,
ADD COLUMN IF NOT EXISTS leitura_horizontal_1 NUMERIC,
ADD COLUMN IF NOT EXISTS leitura_horizontal_2 NUMERIC,
ADD COLUMN IF NOT EXISTS leitura_horizontal_3 NUMERIC,
ADD COLUMN IF NOT EXISTS leitura_horizontal_4 NUMERIC,
ADD COLUMN IF NOT EXISTS leitura_horizontal_5 NUMERIC,
ADD COLUMN IF NOT EXISTS leitura_horizontal_6 NUMERIC,
ADD COLUMN IF NOT EXISTS leitura_horizontal_7 NUMERIC,
ADD COLUMN IF NOT EXISTS leitura_horizontal_8 NUMERIC,
ADD COLUMN IF NOT EXISTS leitura_horizontal_9 NUMERIC,
ADD COLUMN IF NOT EXISTS leitura_horizontal_10 NUMERIC,
ADD COLUMN IF NOT EXISTS valor_medido_horizontal NUMERIC,
ADD COLUMN IF NOT EXISTS valor_minimo_horizontal NUMERIC,
ADD COLUMN IF NOT EXISTS situacao_horizontal TEXT;

-- Comentários para documentar os novos campos
COMMENT ON COLUMN public.retrorrefletividade_estatica.tipo_sinalizacao IS 'Tipo de sinalização: Horizontal ou Vertical';
COMMENT ON COLUMN public.retrorrefletividade_estatica.posicao_horizontal IS 'Posição para sinalização horizontal: Bordo Esquerdo, Eixo ou Bordo Direito';
COMMENT ON COLUMN public.retrorrefletividade_estatica.cor_horizontal IS 'Cor para sinalização horizontal: Amarela ou Branca';
COMMENT ON COLUMN public.retrorrefletividade_estatica.leitura_horizontal_1 IS 'Primeira leitura de retrorrefletividade horizontal';
COMMENT ON COLUMN public.retrorrefletividade_estatica.valor_medido_horizontal IS 'Média das 10 leituras horizontais';
COMMENT ON COLUMN public.retrorrefletividade_estatica.valor_minimo_horizontal IS 'Valor mínimo de referência para sinalização horizontal';
COMMENT ON COLUMN public.retrorrefletividade_estatica.situacao_horizontal IS 'Situação: Conforme ou Não Conforme';