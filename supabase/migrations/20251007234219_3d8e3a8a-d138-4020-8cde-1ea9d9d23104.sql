-- Criar bucket para logos de supervisoras
INSERT INTO storage.buckets (id, name, public)
VALUES ('supervisora-logos', 'supervisora-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Remover policies antigas se existirem
DROP POLICY IF EXISTS "Todos podem ver logos de supervisoras" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem fazer upload de logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem atualizar logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem deletar logos" ON storage.objects;

-- Criar policies
CREATE POLICY "Todos podem ver logos de supervisoras"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'supervisora-logos');

CREATE POLICY "Admins podem fazer upload de logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'supervisora-logos' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins podem atualizar logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'supervisora-logos' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins podem deletar logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'supervisora-logos' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );