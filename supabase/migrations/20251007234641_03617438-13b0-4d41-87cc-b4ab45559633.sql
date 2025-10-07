-- Adicionar role de admin ao usuário cassia.sampaio@dnit.gov.br
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'cassia.sampaio@dnit.gov.br'
ON CONFLICT (user_id, role) DO NOTHING;