-- Adicionar coluna reconciliado (boolean) em todas as tabelas de necessidades

ALTER TABLE public.necessidades_placas 
ADD COLUMN IF NOT EXISTS reconciliado boolean DEFAULT false;

ALTER TABLE public.necessidades_porticos 
ADD COLUMN IF NOT EXISTS reconciliado boolean DEFAULT false;

ALTER TABLE public.necessidades_tachas 
ADD COLUMN IF NOT EXISTS reconciliado boolean DEFAULT false;

ALTER TABLE public.necessidades_cilindros 
ADD COLUMN IF NOT EXISTS reconciliado boolean DEFAULT false;

ALTER TABLE public.necessidades_defensas 
ADD COLUMN IF NOT EXISTS reconciliado boolean DEFAULT false;

ALTER TABLE public.necessidades_marcas_longitudinais 
ADD COLUMN IF NOT EXISTS reconciliado boolean DEFAULT false;

ALTER TABLE public.necessidades_marcas_transversais 
ADD COLUMN IF NOT EXISTS reconciliado boolean DEFAULT false;

-- Atualizar registros existentes: se reconciliado_por está preenchido, reconciliado = true
UPDATE public.necessidades_placas SET reconciliado = true WHERE reconciliado_por IS NOT NULL;
UPDATE public.necessidades_porticos SET reconciliado = true WHERE reconciliado_por IS NOT NULL;
UPDATE public.necessidades_tachas SET reconciliado = true WHERE reconciliado_por IS NOT NULL;
UPDATE public.necessidades_cilindros SET reconciliado = true WHERE reconciliado_por IS NOT NULL;
UPDATE public.necessidades_defensas SET reconciliado = true WHERE reconciliado_por IS NOT NULL;
UPDATE public.necessidades_marcas_longitudinais SET reconciliado = true WHERE reconciliado_por IS NOT NULL;
UPDATE public.necessidades_marcas_transversais SET reconciliado = true WHERE reconciliado_por IS NOT NULL;