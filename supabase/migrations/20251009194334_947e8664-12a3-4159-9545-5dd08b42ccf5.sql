-- Criar políticas RLS para o bucket placa-photos permitir upload de inventário

-- Política para permitir usuários autenticados fazerem upload no inventário
CREATE POLICY "Users can upload inventory photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'placa-photos' 
  AND (storage.foldername(name))[1] = 'inventario'
);

-- Política para permitir usuários autenticados verem fotos do inventário
CREATE POLICY "Users can view inventory photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'placa-photos' 
  AND (storage.foldername(name))[1] = 'inventario'
);

-- Política para permitir usuários autenticados atualizarem suas fotos do inventário
CREATE POLICY "Users can update inventory photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'placa-photos' 
  AND (storage.foldername(name))[1] = 'inventario'
);

-- Política para permitir usuários autenticados deletarem fotos do inventário
CREATE POLICY "Users can delete inventory photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'placa-photos' 
  AND (storage.foldername(name))[1] = 'inventario'
);