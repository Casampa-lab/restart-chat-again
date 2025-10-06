-- Adicionar novos campos na tabela nao_conformidades
ALTER TABLE public.nao_conformidades
ADD COLUMN tipo_nc TEXT,
ADD COLUMN problema_identificado TEXT,
ADD COLUMN situacao TEXT DEFAULT 'Pendente',
ADD COLUMN data_atendimento DATE,
ADD COLUMN observacao TEXT;

-- Renomear campo 'problema' para manter compatibilidade
ALTER TABLE public.nao_conformidades
RENAME COLUMN problema TO descricao_problema;

-- Renomear 'prazo' para 'prazo_atendimento' para ficar mais claro
ALTER TABLE public.nao_conformidades
RENAME COLUMN prazo TO prazo_atendimento;