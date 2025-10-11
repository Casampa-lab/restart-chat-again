-- Remover políticas antigas do bucket placa-photos
DROP POLICY IF EXISTS "Authenticated users can upload placa photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update placa photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete placa photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view placa photos" ON storage.objects;

-- Criar políticas corretas para placa-photos
CREATE POLICY "Users can upload to placa-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'placa-photos'
);

CREATE POLICY "Users can update placa-photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'placa-photos');

CREATE POLICY "Users can delete from placa-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'placa-photos');

CREATE POLICY "Anyone can view placa-photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'placa-photos');