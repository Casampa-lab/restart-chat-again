-- Remover políticas antigas da tabela user_roles
DROP POLICY IF EXISTS "Admin full access user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Política para admins terem acesso total
CREATE POLICY "Admin full access user_roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Política para usuários verem seus próprios perfis
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Política para coordenadores atribuírem perfis (exceto admin)
-- Coordenadores podem gerenciar perfis de usuários da mesma supervisora
CREATE POLICY "Coordenadores podem gerenciar perfis da equipe"
ON public.user_roles
FOR ALL
USING (
  has_role(auth.uid(), 'coordenador') 
  AND role != 'admin'
  AND user_id IN (
    SELECT id 
    FROM public.profiles 
    WHERE supervisora_id = get_user_supervisora_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'coordenador')
  AND role != 'admin'
  AND user_id IN (
    SELECT id 
    FROM public.profiles 
    WHERE supervisora_id = get_user_supervisora_id(auth.uid())
  )
);