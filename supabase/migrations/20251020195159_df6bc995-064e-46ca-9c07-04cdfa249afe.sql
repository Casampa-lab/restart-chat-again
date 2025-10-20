-- Remove policies RLS da tabela supervisora
DROP POLICY IF EXISTS "Admin full access supervisora" ON public.supervisora;
DROP POLICY IF EXISTS "Authenticated users can view supervisora" ON public.supervisora;

-- Remove trigger de update
DROP TRIGGER IF EXISTS update_supervisora_updated_at ON public.supervisora;

-- Remove a tabela legada supervisora (singular)
DROP TABLE IF EXISTS public.supervisora CASCADE;