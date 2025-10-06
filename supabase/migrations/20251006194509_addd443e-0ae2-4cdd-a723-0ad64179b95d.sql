-- 1. Restringir destinatarios_email apenas para admins
DROP POLICY IF EXISTS "Authenticated users can read active destinatarios" ON public.destinatarios_email;

CREATE POLICY "Only admins can read active destinatarios"
ON public.destinatarios_email
FOR SELECT
TO authenticated
USING (
  ativo = true AND 
  has_role(auth.uid(), 'admin'::app_role)
);

-- 2. Restringir empresas apenas para usuários autenticados com roles apropriadas
DROP POLICY IF EXISTS "Authenticated users can read empresas" ON public.empresas;
DROP POLICY IF EXISTS "Everyone can read empresas" ON public.empresas;

CREATE POLICY "Authorized users can read empresas"
ON public.empresas
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'coordenador'::app_role) OR
  has_role(auth.uid(), 'tecnico'::app_role)
);

-- 3. Adicionar comentários explicativos sobre privacidade dos dados
COMMENT ON TABLE public.destinatarios_email IS 'Lista de destinatários de e-mail - Acesso restrito apenas a administradores para proteção contra spam e phishing';
COMMENT ON TABLE public.empresas IS 'Informações de empresas incluindo CNPJ - Acesso restrito a usuários autorizados para proteger relações comerciais';
COMMENT ON TABLE public.profiles IS 'Perfis de usuário incluindo informações de contato - Usuários veem apenas seu próprio perfil, admins e coordenadores têm acesso para gestão';