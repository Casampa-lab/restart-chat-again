-- Adicionar DEFAULT na coluna numero_nc para gerar automaticamente
ALTER TABLE public.nao_conformidades 
ALTER COLUMN numero_nc SET DEFAULT generate_nc_number();