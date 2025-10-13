-- Remover políticas existentes se necessário e recriar todas
DROP POLICY IF EXISTS "Users can upload to verificacao-photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to porticos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to inscricoes" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to marcas-longitudinais" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to tachas" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to defensas" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to cilindros" ON storage.objects;

-- Criar todas as 7 políticas de INSERT
CREATE POLICY "Users can upload to verificacao-photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'verificacao-photos');

CREATE POLICY "Users can upload to porticos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'porticos');

CREATE POLICY "Users can upload to inscricoes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'inscricoes');

CREATE POLICY "Users can upload to marcas-longitudinais"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'marcas-longitudinais');

CREATE POLICY "Users can upload to tachas"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tachas');

CREATE POLICY "Users can upload to defensas"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'defensas');

CREATE POLICY "Users can upload to cilindros"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'cilindros');