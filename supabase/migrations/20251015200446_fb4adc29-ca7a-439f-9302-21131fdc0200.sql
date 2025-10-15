-- Adicionar role admin ao usuário admin@operavia.online
INSERT INTO user_roles (user_id, role)
VALUES ('dcb68048-f965-4cc2-8770-ed301539d443', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;