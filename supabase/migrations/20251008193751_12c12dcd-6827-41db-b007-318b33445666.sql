-- Adicionar nova coluna numeric para extensao_contratada
ALTER TABLE public.frentes_liberadas 
ADD COLUMN extensao_contratada NUMERIC;

-- Copiar dados válidos (tentar converter, se falhar usar NULL)
UPDATE public.frentes_liberadas
SET extensao_contratada = CASE 
  WHEN tipo_servico ~ '^[0-9]+\.?[0-9]*$' THEN tipo_servico::numeric
  ELSE NULL
END;

-- Remover coluna antiga
ALTER TABLE public.frentes_liberadas 
DROP COLUMN tipo_servico;