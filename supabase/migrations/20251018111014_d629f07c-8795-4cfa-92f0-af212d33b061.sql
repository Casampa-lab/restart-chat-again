-- Criar bucket para upload de placas SVG
INSERT INTO storage.buckets (id, name, public)
VALUES ('placa-svgs', 'placa-svgs', true)
ON CONFLICT (id) DO NOTHING;

-- Permitir uploads autenticados
CREATE POLICY "Permitir upload de placas SVG"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'placa-svgs' AND (storage.foldername(name))[1] IN ('regulamentacao', 'advertencia', 'indicacao'));

-- Permitir leitura pública
CREATE POLICY "Permitir leitura pública de placas SVG"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'placa-svgs');

-- Permitir atualização pelos próprios usuários
CREATE POLICY "Permitir atualização de placas SVG"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'placa-svgs');

-- Permitir deleção por usuários autenticados
CREATE POLICY "Permitir deleção de placas SVG"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'placa-svgs');