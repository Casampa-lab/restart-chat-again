-- Adicionar campos de contato ao lote
ALTER TABLE public.lotes
ADD COLUMN responsavel_executora TEXT,
ADD COLUMN email_executora TEXT,
ADD COLUMN nome_fiscal_execucao TEXT,
ADD COLUMN email_fiscal_execucao TEXT;