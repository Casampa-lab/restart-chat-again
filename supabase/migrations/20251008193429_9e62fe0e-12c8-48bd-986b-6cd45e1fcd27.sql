-- Renomear coluna responsavel para portaria_aprovacao_projeto na tabela frentes_liberadas
ALTER TABLE public.frentes_liberadas 
RENAME COLUMN responsavel TO portaria_aprovacao_projeto;