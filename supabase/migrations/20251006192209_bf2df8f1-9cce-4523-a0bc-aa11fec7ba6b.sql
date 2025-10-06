-- Create storage bucket for NC photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('nc-photos', 'nc-photos', true);

-- Create storage policies for NC photos
CREATE POLICY "Users can view NC photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'nc-photos');

CREATE POLICY "Users can upload their own NC photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'nc-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own NC photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'nc-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own NC photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'nc-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create table for detailed NC records
CREATE TABLE public.registro_nc (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_registro TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  lote_id UUID NOT NULL,
  rodovia_id UUID NOT NULL,
  data_registro DATE NOT NULL,
  km_inicial NUMERIC NOT NULL,
  km_final NUMERIC NOT NULL,
  snv TEXT,
  supervisora TEXT NOT NULL,
  contrato_supervisora TEXT,
  construtora TEXT NOT NULL,
  contrato_construtora TEXT,
  tipo_obra TEXT NOT NULL CHECK (tipo_obra IN ('Execução', 'Manutenção')),
  natureza TEXT NOT NULL CHECK (natureza IN ('S.H.', 'S.V.', 'D.S.', 'Outra')),
  natureza_outra TEXT,
  grau TEXT NOT NULL CHECK (grau IN ('Leve', 'Média', 'Grave', 'Gravíssima')),
  problema_identificado TEXT NOT NULL,
  comentarios_supervisora TEXT,
  comentarios_executora TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for NC photos
CREATE TABLE public.registro_nc_fotos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_nc_id UUID NOT NULL REFERENCES public.registro_nc(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL CHECK (ordem >= 1 AND ordem <= 4),
  foto_url TEXT NOT NULL,
  snv TEXT,
  km NUMERIC,
  sentido TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(registro_nc_id, ordem)
);

-- Enable Row Level Security
ALTER TABLE public.registro_nc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registro_nc_fotos ENABLE ROW LEVEL SECURITY;

-- Create policies for registro_nc
CREATE POLICY "Users can view their own registro_nc"
ON public.registro_nc
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own registro_nc"
ON public.registro_nc
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own registro_nc"
ON public.registro_nc
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own registro_nc"
ON public.registro_nc
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores can view all registro_nc"
ON public.registro_nc
FOR SELECT
USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create policies for registro_nc_fotos
CREATE POLICY "Users can view photos of their own registro_nc"
ON public.registro_nc_fotos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.registro_nc
    WHERE id = registro_nc_fotos.registro_nc_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create photos for their own registro_nc"
ON public.registro_nc_fotos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.registro_nc
    WHERE id = registro_nc_fotos.registro_nc_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update photos of their own registro_nc"
ON public.registro_nc_fotos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.registro_nc
    WHERE id = registro_nc_fotos.registro_nc_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete photos of their own registro_nc"
ON public.registro_nc_fotos
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.registro_nc
    WHERE id = registro_nc_fotos.registro_nc_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Coordenadores can view all registro_nc_fotos"
ON public.registro_nc_fotos
FOR SELECT
USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_registro_nc_updated_at
BEFORE UPDATE ON public.registro_nc
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate next NC number
CREATE OR REPLACE FUNCTION public.generate_nc_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  new_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_registro FROM 3) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.registro_nc;
  
  new_number := 'NC' || LPAD(next_num::TEXT, 5, '0');
  RETURN new_number;
END;
$$;