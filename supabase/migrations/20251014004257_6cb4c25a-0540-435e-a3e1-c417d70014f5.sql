-- Permitir que coordenadores e admins vejam todos os perfis
-- (necessário para os JOINs em elementos_pendentes_aprovacao)

DROP POLICY IF EXISTS "Coordenadores e admins podem ver todos os perfis" ON public.profiles;

CREATE POLICY "Coordenadores e admins podem ver todos os perfis"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'coordenador'::app_role)
);