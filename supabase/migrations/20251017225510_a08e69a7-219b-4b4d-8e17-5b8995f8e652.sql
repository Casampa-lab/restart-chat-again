-- Adicionar coluna unidade_administrativa na tabela lotes
ALTER TABLE public.lotes 
ADD COLUMN unidade_administrativa TEXT;

COMMENT ON COLUMN public.lotes.unidade_administrativa IS 'Unidade Local ou Regional responsável pelo lote (ex: UL Caxambu, SR Belo Horizonte)';