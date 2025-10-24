-- Políticas RLS para o bucket intervencoes-fotos
-- Garantir que usuários autenticados só possam fazer upload/ler/deletar suas próprias fotos

-- Permitir uploads autenticados apenas para prefixo do próprio usuário
CREATE POLICY "auth_users_can_upload_own_folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'intervencoes-fotos'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- Permitir leitura de suas próprias fotos
CREATE POLICY "auth_users_can_read_own_uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'intervencoes-fotos'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- Permitir exclusão de suas próprias fotos
CREATE POLICY "auth_users_can_delete_own_uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'intervencoes-fotos'
  AND split_part(name, '/', 1) = auth.uid()::text
);