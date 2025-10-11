-- Corrigir políticas RLS para TODOS os buckets de inventário de uma vez
-- para evitar o mesmo problema que aconteceu com placa-photos

-- CILINDROS
CREATE POLICY "Users can upload to cilindros"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cilindros');

CREATE POLICY "Users can update cilindros"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'cilindros');

CREATE POLICY "Users can delete from cilindros"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cilindros');

-- DEFENSAS
CREATE POLICY "Users can upload to defensas"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'defensas');

CREATE POLICY "Users can update defensas"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'defensas');

CREATE POLICY "Users can delete from defensas"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'defensas');

-- INSCRICOES
CREATE POLICY "Users can upload to inscricoes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inscricoes');

CREATE POLICY "Users can update inscricoes"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'inscricoes');

CREATE POLICY "Users can delete from inscricoes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'inscricoes');

-- MARCAS-LONGITUDINAIS
CREATE POLICY "Users can upload to marcas-longitudinais"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'marcas-longitudinais');

CREATE POLICY "Users can update marcas-longitudinais"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'marcas-longitudinais');

CREATE POLICY "Users can delete from marcas-longitudinais"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'marcas-longitudinais');

-- PORTICOS
CREATE POLICY "Users can upload to porticos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'porticos');

CREATE POLICY "Users can update porticos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'porticos');

CREATE POLICY "Users can delete from porticos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'porticos');

-- TACHAS
CREATE POLICY "Users can upload to tachas"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tachas');

CREATE POLICY "Users can update tachas"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tachas');

CREATE POLICY "Users can delete from tachas"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tachas');