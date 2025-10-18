-- Adicionar coluna outros_materiais à tabela ficha_inscricoes
ALTER TABLE public.ficha_inscricoes 
ADD COLUMN IF NOT EXISTS outros_materiais text;

COMMENT ON COLUMN public.ficha_inscricoes.outros_materiais IS 'Descrever sucintamente o material utilizado. Ex.: "Tinta acrílica à base de solvente", "Tinta com resina livre", etc. Quando não houver usar "-".';