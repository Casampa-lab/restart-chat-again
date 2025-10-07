-- Corrigir política RLS para coordinator_assignments
-- Remover políticas antigas
DROP POLICY IF EXISTS "Admin full access coordinator_assignments" ON public.coordinator_assignments;
DROP POLICY IF EXISTS "Coordinators can view own assignments" ON public.coordinator_assignments;

-- Criar política completa para admins (com check expression)
CREATE POLICY "Admin full access coordinator_assignments"
ON public.coordinator_assignments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Criar política para coordenadores verem suas atribuições
CREATE POLICY "Coordinators can view own assignments"
ON public.coordinator_assignments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);