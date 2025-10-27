-- Migração Opção A: Tornar user_id NULLABLE em tabelas de intervenções
-- Permite INSERTs de intervenções tipo 'manutencao_pre_projeto' sem user_id obrigatório

ALTER TABLE public.defensas_intervencoes
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.ficha_cilindros_intervencoes
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.ficha_inscricoes_intervencoes
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.ficha_marcas_longitudinais_intervencoes
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.ficha_porticos_intervencoes
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.ficha_tachas_intervencoes
  ALTER COLUMN user_id DROP NOT NULL;