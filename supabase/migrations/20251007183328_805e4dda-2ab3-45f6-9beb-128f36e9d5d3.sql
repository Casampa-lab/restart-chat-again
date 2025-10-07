-- Criar tabela para informações da supervisora
CREATE TABLE IF NOT EXISTS public.supervisora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa TEXT NOT NULL,
  contrato TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supervisora ENABLE ROW LEVEL SECURITY;

-- Policies para admin
CREATE POLICY "Admin full access supervisora"
ON public.supervisora
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view supervisora"
ON public.supervisora
FOR SELECT
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_supervisora_updated_at
BEFORE UPDATE ON public.supervisora
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar bucket para logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('supervisora-logos', 'supervisora-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies para logos
CREATE POLICY "Admin can upload supervisora logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'supervisora-logos' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update supervisora logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'supervisora-logos' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete supervisora logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'supervisora-logos' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view supervisora logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'supervisora-logos');