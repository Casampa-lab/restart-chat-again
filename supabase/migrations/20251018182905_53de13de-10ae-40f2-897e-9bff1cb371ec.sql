-- Adicionar coluna descricao na tabela ficha_tachas
ALTER TABLE public.ficha_tachas 
ADD COLUMN IF NOT EXISTS descricao text;

COMMENT ON COLUMN public.ficha_tachas.descricao IS 'Descrição da tacha conforme cadastro original';