-- Remover tabelas antigas de marcas transversais que foram substituídas por cilindros
DROP TABLE IF EXISTS public.ficha_marcas_transversais_intervencoes CASCADE;
DROP TABLE IF EXISTS public.ficha_marcas_transversais CASCADE;
DROP TABLE IF EXISTS public.intervencoes_marcas_transversais CASCADE;