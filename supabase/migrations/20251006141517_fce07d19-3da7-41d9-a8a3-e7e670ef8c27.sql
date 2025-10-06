-- Permitir NULL no campo descricao_problema (antigo 'problema')
ALTER TABLE public.nao_conformidades
ALTER COLUMN descricao_problema DROP NOT NULL;

-- Também permitir NULL nos novos campos que são opcionais
ALTER TABLE public.nao_conformidades
ALTER COLUMN tipo_nc DROP NOT NULL,
ALTER COLUMN problema_identificado DROP NOT NULL;