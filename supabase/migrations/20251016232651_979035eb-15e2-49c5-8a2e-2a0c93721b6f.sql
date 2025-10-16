-- Adicionar políticas RLS para gerenciamento de empresas por admins

-- Política INSERT - Apenas admins podem criar empresas
CREATE POLICY "Apenas admins podem criar empresas"
ON empresas
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Política UPDATE - Apenas admins podem atualizar empresas
CREATE POLICY "Apenas admins podem atualizar empresas"
ON empresas
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Política DELETE - Apenas admins podem deletar empresas
CREATE POLICY "Apenas admins podem deletar empresas"
ON empresas
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));