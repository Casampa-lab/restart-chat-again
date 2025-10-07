-- Remover apenas policy duplicada de empresas
DROP POLICY IF EXISTS "Admin full access empresas" ON public.empresas;