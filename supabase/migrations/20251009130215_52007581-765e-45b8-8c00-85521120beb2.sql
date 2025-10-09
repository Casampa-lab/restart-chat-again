-- Remover políticas duplicadas e problemáticas da tabela user_roles
DROP POLICY IF EXISTS "Admin full access user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins podem gerenciar roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users podem ver próprio role" ON public.user_roles;
DROP POLICY IF EXISTS "Coordenadores podem gerenciar perfis da equipe" ON public.user_roles;

-- Criar políticas RLS corretas para user_roles
-- Admins têm acesso total
CREATE POLICY "Admins have full access to user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Usuários podem ver seus próprios roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Coordenadores podem gerenciar roles da sua equipe (exceto admin)
CREATE POLICY "Coordinators can manage team roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'coordenador'::app_role) 
  AND role <> 'admin'::app_role
  AND user_id IN (
    SELECT id FROM public.profiles 
    WHERE supervisora_id = get_user_supervisora_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'coordenador'::app_role) 
  AND role <> 'admin'::app_role
  AND user_id IN (
    SELECT id FROM public.profiles 
    WHERE supervisora_id = get_user_supervisora_id(auth.uid())
  )
);