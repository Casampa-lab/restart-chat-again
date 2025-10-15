-- Adicionar coluna fotos_urls (array de texto) para múltiplas fotos em todas as tabelas de intervenções

ALTER TABLE ficha_placa_intervencoes 
ADD COLUMN fotos_urls TEXT[] DEFAULT '{}';

ALTER TABLE ficha_marcas_longitudinais_intervencoes 
ADD COLUMN fotos_urls TEXT[] DEFAULT '{}';

ALTER TABLE ficha_tachas_intervencoes 
ADD COLUMN fotos_urls TEXT[] DEFAULT '{}';

ALTER TABLE ficha_cilindros_intervencoes 
ADD COLUMN fotos_urls TEXT[] DEFAULT '{}';

ALTER TABLE ficha_inscricoes_intervencoes 
ADD COLUMN fotos_urls TEXT[] DEFAULT '{}';

ALTER TABLE ficha_porticos_intervencoes 
ADD COLUMN fotos_urls TEXT[] DEFAULT '{}';

ALTER TABLE defensas_intervencoes 
ADD COLUMN fotos_urls TEXT[] DEFAULT '{}';

-- Criar bucket para fotos de intervenções (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('intervencoes-fotos', 'intervencoes-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket
CREATE POLICY "Fotos intervenções são públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'intervencoes-fotos');

CREATE POLICY "Usuários podem fazer upload de fotos intervenções"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'intervencoes-fotos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem atualizar suas fotos intervenções"
ON storage.objects FOR UPDATE
USING (bucket_id = 'intervencoes-fotos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem deletar suas fotos intervenções"
ON storage.objects FOR DELETE
USING (bucket_id = 'intervencoes-fotos' AND auth.uid() IS NOT NULL);