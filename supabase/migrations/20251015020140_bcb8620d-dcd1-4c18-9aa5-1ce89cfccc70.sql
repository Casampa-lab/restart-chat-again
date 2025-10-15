
-- Remove política existente que está incompleta
DROP POLICY IF EXISTS "Admin full access rodovias" ON rodovias;

-- Recria política com WITH CHECK para permitir INSERT
CREATE POLICY "Admin full access rodovias"
ON rodovias
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
