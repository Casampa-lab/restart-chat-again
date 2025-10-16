-- Remover política antiga que pode estar causando conflito
DROP POLICY IF EXISTS "Coordenadores podem criar NCs" ON public.nao_conformidades;

-- Nova política para INSERT: Coordenadores e admins podem criar NCs para qualquer usuário
CREATE POLICY "Coordenadores podem criar NCs"
ON public.nao_conformidades
FOR INSERT
TO authenticated
WITH CHECK (
  -- Coordenadores e admins podem criar NCs
  has_role(auth.uid(), 'coordenador') OR 
  has_role(auth.uid(), 'admin') OR
  -- Usuários podem criar NCs para si mesmos
  auth.uid() = user_id
);