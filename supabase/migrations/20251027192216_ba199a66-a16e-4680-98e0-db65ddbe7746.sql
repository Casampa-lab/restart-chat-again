
-- Adicionar campo 'solucao' nas tabelas de intervenções
-- Cilindros
ALTER TABLE public.ficha_cilindros_intervencoes
ADD COLUMN IF NOT EXISTS solucao text NOT NULL DEFAULT 'Implantação';

-- Defensas
ALTER TABLE public.defensas_intervencoes
ADD COLUMN IF NOT EXISTS solucao text NOT NULL DEFAULT 'Implantação';

-- Pórticos
ALTER TABLE public.ficha_porticos_intervencoes
ADD COLUMN IF NOT EXISTS solucao text NOT NULL DEFAULT 'Implantação';

-- Placas (intervenções)
ALTER TABLE public.ficha_placa_intervencoes
ADD COLUMN IF NOT EXISTS solucao text NOT NULL DEFAULT 'Implantação';

-- Remover o default após criação para que seja obrigatório preencher
ALTER TABLE public.ficha_cilindros_intervencoes
ALTER COLUMN solucao DROP DEFAULT;

ALTER TABLE public.defensas_intervencoes
ALTER COLUMN solucao DROP DEFAULT;

ALTER TABLE public.ficha_porticos_intervencoes
ALTER COLUMN solucao DROP DEFAULT;

ALTER TABLE public.ficha_placa_intervencoes
ALTER COLUMN solucao DROP DEFAULT;
