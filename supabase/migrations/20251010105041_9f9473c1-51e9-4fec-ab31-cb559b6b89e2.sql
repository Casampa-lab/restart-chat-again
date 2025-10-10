-- Corrigir política de INSERT na tabela ficha_placa_intervencoes
-- Permite que admins e coordenadores criem intervenções em qualquer ficha
-- Usuários comuns só podem criar em suas próprias fichas

DROP POLICY IF EXISTS "Users can create intervencoes for their own fichas placa" ON ficha_placa_intervencoes;

CREATE POLICY "Users can create intervencoes for fichas placa"
ON ficha_placa_intervencoes
FOR INSERT
WITH CHECK (
  -- Admins e coordenadores podem criar em qualquer ficha
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'coordenador'::app_role)
  -- Usuários comuns podem criar apenas nas suas próprias fichas
  OR EXISTS (
    SELECT 1
    FROM ficha_placa
    WHERE ficha_placa.id = ficha_placa_intervencoes.ficha_placa_id 
    AND ficha_placa.user_id = auth.uid()
  )
);

-- Também corrigir política de UPDATE para mesma lógica
DROP POLICY IF EXISTS "Users can update intervencoes of their own fichas placa" ON ficha_placa_intervencoes;

CREATE POLICY "Users can update intervencoes of fichas placa"
ON ficha_placa_intervencoes
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordenador'::app_role)
  OR EXISTS (
    SELECT 1
    FROM ficha_placa
    WHERE ficha_placa.id = ficha_placa_intervencoes.ficha_placa_id 
    AND ficha_placa.user_id = auth.uid()
  )
);

-- Corrigir política de DELETE
DROP POLICY IF EXISTS "Users can delete intervencoes of their own fichas placa" ON ficha_placa_intervencoes;

CREATE POLICY "Users can delete intervencoes of fichas placa"
ON ficha_placa_intervencoes
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordenador'::app_role)
  OR EXISTS (
    SELECT 1
    FROM ficha_placa
    WHERE ficha_placa.id = ficha_placa_intervencoes.ficha_placa_id 
    AND ficha_placa.user_id = auth.uid()
  )
);