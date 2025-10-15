-- Correção: Permitir que coordenadores também vejam rodovias
-- Problema: Política permite apenas admin, mas coordenadores precisam ver rodovias para gerenciar lotes

DROP POLICY IF EXISTS "Admin full access rodovias" ON rodovias;

-- Admins têm acesso completo
CREATE POLICY "Admin full access rodovias"
ON rodovias
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Coordenadores podem apenas visualizar (SELECT)
CREATE POLICY "Coordenadores podem ver rodovias"
ON rodovias
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'coordenador'::app_role));