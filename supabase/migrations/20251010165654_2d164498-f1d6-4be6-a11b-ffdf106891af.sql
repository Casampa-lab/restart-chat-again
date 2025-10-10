-- Criar buckets para todos os tipos de inventário e intervenções

-- Bucket para inscrições
INSERT INTO storage.buckets (id, name, public)
VALUES ('inscricoes', 'inscricoes', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket para marcas longitudinais
INSERT INTO storage.buckets (id, name, public)
VALUES ('marcas-longitudinais', 'marcas-longitudinais', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket para tachas
INSERT INTO storage.buckets (id, name, public)
VALUES ('tachas', 'tachas', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket para defensas
INSERT INTO storage.buckets (id, name, public)
VALUES ('defensas', 'defensas', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket para cilindros
INSERT INTO storage.buckets (id, name, public)
VALUES ('cilindros', 'cilindros', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso para inscrições
CREATE POLICY "Usuários podem fazer upload de fotos de inscrições"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'inscricoes');

CREATE POLICY "Fotos de inscrições são publicamente acessíveis"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'inscricoes');

CREATE POLICY "Usuários podem atualizar fotos de inscrições"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'inscricoes');

CREATE POLICY "Usuários podem deletar fotos de inscrições"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'inscricoes');

-- Políticas de acesso para marcas longitudinais
CREATE POLICY "Usuários podem fazer upload de fotos de marcas longitudinais"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'marcas-longitudinais');

CREATE POLICY "Fotos de marcas longitudinais são publicamente acessíveis"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'marcas-longitudinais');

CREATE POLICY "Usuários podem atualizar fotos de marcas longitudinais"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'marcas-longitudinais');

CREATE POLICY "Usuários podem deletar fotos de marcas longitudinais"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'marcas-longitudinais');

-- Políticas de acesso para tachas
CREATE POLICY "Usuários podem fazer upload de fotos de tachas"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tachas');

CREATE POLICY "Fotos de tachas são publicamente acessíveis"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'tachas');

CREATE POLICY "Usuários podem atualizar fotos de tachas"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'tachas');

CREATE POLICY "Usuários podem deletar fotos de tachas"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'tachas');

-- Políticas de acesso para defensas
CREATE POLICY "Usuários podem fazer upload de fotos de defensas"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'defensas');

CREATE POLICY "Fotos de defensas são publicamente acessíveis"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'defensas');

CREATE POLICY "Usuários podem atualizar fotos de defensas"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'defensas');

CREATE POLICY "Usuários podem deletar fotos de defensas"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'defensas');

-- Políticas de acesso para cilindros
CREATE POLICY "Usuários podem fazer upload de fotos de cilindros"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'cilindros');

CREATE POLICY "Fotos de cilindros são publicamente acessíveis"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'cilindros');

CREATE POLICY "Usuários podem atualizar fotos de cilindros"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'cilindros');

CREATE POLICY "Usuários podem deletar fotos de cilindros"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'cilindros');