-- Adicionar coluna snv à tabela ficha_inscricoes
ALTER TABLE public.ficha_inscricoes ADD COLUMN IF NOT EXISTS snv TEXT;

-- Migrar dados de observacao que contenham SNV para a nova coluna
UPDATE public.ficha_inscricoes
SET snv = TRIM(SUBSTRING(observacao FROM 'SNV:\s*([^\n,]+)'))
WHERE observacao LIKE '%SNV:%' AND snv IS NULL;

-- Criar índice para melhor performance em consultas por SNV
CREATE INDEX IF NOT EXISTS idx_ficha_inscricoes_snv ON public.ficha_inscricoes(snv);