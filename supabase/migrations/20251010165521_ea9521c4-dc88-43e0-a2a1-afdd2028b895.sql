-- Criar bucket para fotos de pórticos
INSERT INTO storage.buckets (id, name, public)
VALUES ('porticos', 'porticos', true);

-- Política para permitir usuários autenticados fazerem upload de fotos
CREATE POLICY "Usuários podem fazer upload de fotos de pórticos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'porticos');

-- Política para permitir leitura pública das fotos
CREATE POLICY "Fotos de pórticos são publicamente acessíveis"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'porticos');

-- Política para permitir usuários atualizarem suas próprias fotos
CREATE POLICY "Usuários podem atualizar fotos de pórticos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'porticos');

-- Política para permitir usuários deletarem fotos
CREATE POLICY "Usuários podem deletar fotos de pórticos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'porticos');