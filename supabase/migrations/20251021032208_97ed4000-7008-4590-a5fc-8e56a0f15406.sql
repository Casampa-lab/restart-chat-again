-- Fase 1: Alterar CHECK CONSTRAINT para permitir origem='necessidade' em todas as tabelas

-- ficha_marcas_longitudinais
ALTER TABLE public.ficha_marcas_longitudinais
DROP CONSTRAINT IF EXISTS ficha_marcas_longitudinais_origem_check;

ALTER TABLE public.ficha_marcas_longitudinais
ADD CONSTRAINT ficha_marcas_longitudinais_origem_check
CHECK (origem = ANY (ARRAY['cadastro_inicial'::text, 'necessidade'::text, 'necessidade_campo'::text, 'importacao'::text, 'execucao'::text, 'manutencao_pre_projeto'::text]));

-- ficha_tachas
ALTER TABLE public.ficha_tachas
DROP CONSTRAINT IF EXISTS ficha_tachas_origem_check;

ALTER TABLE public.ficha_tachas
ADD CONSTRAINT ficha_tachas_origem_check
CHECK (origem = ANY (ARRAY['cadastro_inicial'::text, 'necessidade'::text, 'necessidade_campo'::text, 'importacao'::text, 'execucao'::text, 'manutencao_pre_projeto'::text]));

-- ficha_cilindros
ALTER TABLE public.ficha_cilindros
DROP CONSTRAINT IF EXISTS ficha_cilindros_origem_check;

ALTER TABLE public.ficha_cilindros
ADD CONSTRAINT ficha_cilindros_origem_check
CHECK (origem = ANY (ARRAY['cadastro_inicial'::text, 'necessidade'::text, 'necessidade_campo'::text, 'importacao'::text, 'execucao'::text, 'manutencao_pre_projeto'::text]));

-- ficha_inscricoes
ALTER TABLE public.ficha_inscricoes
DROP CONSTRAINT IF EXISTS ficha_inscricoes_origem_check;

ALTER TABLE public.ficha_inscricoes
ADD CONSTRAINT ficha_inscricoes_origem_check
CHECK (origem = ANY (ARRAY['cadastro_inicial'::text, 'necessidade'::text, 'necessidade_campo'::text, 'importacao'::text, 'execucao'::text, 'manutencao_pre_projeto'::text]));

-- ficha_placa
ALTER TABLE public.ficha_placa
DROP CONSTRAINT IF EXISTS ficha_placa_origem_check;

ALTER TABLE public.ficha_placa
ADD CONSTRAINT ficha_placa_origem_check
CHECK (origem = ANY (ARRAY['cadastro_inicial'::text, 'necessidade'::text, 'necessidade_campo'::text, 'importacao'::text, 'execucao'::text, 'manutencao_pre_projeto'::text]));

-- defensas
ALTER TABLE public.defensas
DROP CONSTRAINT IF EXISTS defensas_origem_check;

ALTER TABLE public.defensas
ADD CONSTRAINT defensas_origem_check
CHECK (origem = ANY (ARRAY['cadastro_inicial'::text, 'necessidade'::text, 'necessidade_campo'::text, 'importacao'::text, 'execucao'::text, 'manutencao_pre_projeto'::text]));

-- ficha_porticos
ALTER TABLE public.ficha_porticos
DROP CONSTRAINT IF EXISTS ficha_porticos_origem_check;

ALTER TABLE public.ficha_porticos
ADD CONSTRAINT ficha_porticos_origem_check
CHECK (origem = ANY (ARRAY['cadastro_inicial'::text, 'necessidade'::text, 'necessidade_campo'::text, 'importacao'::text, 'execucao'::text, 'manutencao_pre_projeto'::text]));

-- Fase 2: Corrigir elementos existentes com origem='necessidade_campo' -> 'necessidade'

UPDATE public.ficha_marcas_longitudinais
SET origem = 'necessidade',
    modificado_por_intervencao = false
WHERE origem = 'necessidade_campo';

UPDATE public.ficha_tachas
SET origem = 'necessidade',
    modificado_por_intervencao = false
WHERE origem = 'necessidade_campo';

UPDATE public.ficha_cilindros
SET origem = 'necessidade',
    modificado_por_intervencao = false
WHERE origem = 'necessidade_campo';

UPDATE public.ficha_inscricoes
SET origem = 'necessidade',
    modificado_por_intervencao = false
WHERE origem = 'necessidade_campo';

UPDATE public.ficha_placa
SET origem = 'necessidade',
    modificado_por_intervencao = false
WHERE origem = 'necessidade_campo';

UPDATE public.defensas
SET origem = 'necessidade',
    modificado_por_intervencao = false
WHERE origem = 'necessidade_campo';

UPDATE public.ficha_porticos
SET origem = 'necessidade',
    modificado_por_intervencao = false
WHERE origem = 'necessidade_campo';