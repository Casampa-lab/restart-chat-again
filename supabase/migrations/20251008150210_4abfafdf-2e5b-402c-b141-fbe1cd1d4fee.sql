-- Remover policies duplicadas e criar uma estrutura mais segura para a tabela supervisoras
DROP POLICY IF EXISTS "Admins full access supervisoras" ON public.supervisoras;
DROP POLICY IF EXISTS "Admins gerenciam supervisoras" ON public.supervisoras;
DROP POLICY IF EXISTS "Coordenadores veem própria supervisora" ON public.supervisoras;
DROP POLICY IF EXISTS "Usuários veem sua supervisora" ON public.supervisoras;
DROP POLICY IF EXISTS "Authenticated users can view supervisora" ON public.supervisoras;

-- Policy consolidada para SELECT - usuários veem apenas sua própria supervisora
CREATE POLICY "Users view own supervisora only"
ON public.supervisoras
FOR SELECT
TO authenticated
USING (
  -- Admin pode ver todas
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Usuários veem apenas a supervisora à qual pertencem
  id IN (
    SELECT supervisora_id 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND supervisora_id IS NOT NULL
  )
);

-- Policy para INSERT - apenas admins
CREATE POLICY "Only admins can insert supervisoras"
ON public.supervisoras
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Policy para UPDATE - apenas admins
CREATE POLICY "Only admins can update supervisoras"
ON public.supervisoras
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Policy para DELETE - apenas admins
CREATE POLICY "Only admins can delete supervisoras"
ON public.supervisoras
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Comentário para documentação
COMMENT ON TABLE public.supervisoras IS 'Tabela de supervisoras - acesso restrito: usuários veem apenas sua própria supervisora, admins têm acesso total';