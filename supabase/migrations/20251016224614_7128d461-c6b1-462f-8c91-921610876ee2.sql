-- Remover política antiga de UPDATE
DROP POLICY IF EXISTS "Only admins can update supervisoras" ON public.supervisoras;

-- Criar nova política permitindo coordenadores editarem própria supervisora
CREATE POLICY "Admins and coordinators can update own supervisora"
ON public.supervisoras
FOR UPDATE
TO authenticated
USING (
  -- Admins: acesso total
  has_role(auth.uid(), 'admin'::app_role)
  OR 
  -- Coordenadores: apenas supervisora vinculada ao seu perfil
  (
    has_role(auth.uid(), 'coordenador'::app_role)
    AND id IN (
      SELECT supervisora_id 
      FROM profiles 
      WHERE id = auth.uid() AND supervisora_id IS NOT NULL
    )
  )
)
WITH CHECK (
  -- Mesma lógica para verificação de inserção/atualização
  has_role(auth.uid(), 'admin'::app_role)
  OR 
  (
    has_role(auth.uid(), 'coordenador'::app_role)
    AND id IN (
      SELECT supervisora_id 
      FROM profiles 
      WHERE id = auth.uid() AND supervisora_id IS NOT NULL
    )
  )
);