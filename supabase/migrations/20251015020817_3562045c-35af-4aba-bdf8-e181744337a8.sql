-- Correção crítica: Recriar política RLS "Admin full access rodovias" com FOR ALL
-- Problema: A política anterior não incluía SELECT, impedindo admins de visualizar rodovias

-- Remove a política problemática
DROP POLICY IF EXISTS "Admin full access rodovias" ON rodovias;

-- Recria com acesso completo (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admin full access rodovias"
ON rodovias
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));