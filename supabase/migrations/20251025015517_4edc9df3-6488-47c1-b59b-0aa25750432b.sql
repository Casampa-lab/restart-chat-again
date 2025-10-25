-- Adicionar colunas estruturais de placas à tabela ficha_placa_intervencoes
ALTER TABLE public.ficha_placa_intervencoes
ADD COLUMN IF NOT EXISTS tipo TEXT,
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS lado TEXT,
ADD COLUMN IF NOT EXISTS material TEXT,
ADD COLUMN IF NOT EXISTS largura_mm INTEGER,
ADD COLUMN IF NOT EXISTS altura_mm INTEGER;

-- Adicionar índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_ficha_placa_intervencoes_codigo ON public.ficha_placa_intervencoes(codigo);
CREATE INDEX IF NOT EXISTS idx_ficha_placa_intervencoes_tipo ON public.ficha_placa_intervencoes(tipo);