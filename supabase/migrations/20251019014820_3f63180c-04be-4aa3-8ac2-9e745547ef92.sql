-- Criar bucket para armazenar camadas SNV convertidas
INSERT INTO storage.buckets (id, name, public)
VALUES ('snv-layers', 'snv-layers', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Apenas admins podem fazer upload de camadas SNV
CREATE POLICY "Admin upload SNV layers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'snv-layers' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS: Todos podem ler camadas SNV (público)
CREATE POLICY "Public read SNV layers"
ON storage.objects FOR SELECT
USING (bucket_id = 'snv-layers');

-- RLS: Apenas admins podem deletar camadas antigas
CREATE POLICY "Admin delete SNV layers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'snv-layers' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Adicionar campo para metadados da camada SNV ativa na tabela configuracoes
INSERT INTO configuracoes (chave, valor, descricao)
VALUES (
  'snv_geojson_metadata',
  '{"versao": null, "storage_path": null, "features_count": 0, "data_upload": null, "uploaded_by": null}',
  'Metadados da camada SNV GeoJSON ativa no sistema'
) ON CONFLICT (chave) DO NOTHING;