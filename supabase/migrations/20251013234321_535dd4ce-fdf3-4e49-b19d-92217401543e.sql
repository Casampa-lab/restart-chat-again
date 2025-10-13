-- Remover política antiga de INSERT
DROP POLICY IF EXISTS "Usuários criam próprios registros" ON elementos_pendentes_aprovacao;

-- Criar política correta com WITH CHECK
CREATE POLICY "Usuários criam próprios registros" 
ON elementos_pendentes_aprovacao
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);