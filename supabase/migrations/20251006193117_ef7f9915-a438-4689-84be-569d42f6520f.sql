-- Create storage bucket for placa photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('placa-photos', 'placa-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for placa photos
CREATE POLICY "Users can view placa photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'placa-photos');

CREATE POLICY "Users can upload their own placa photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'placa-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own placa photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'placa-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own placa photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'placa-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create table for placa sheets
CREATE TABLE public.ficha_placa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lote_id UUID NOT NULL,
  rodovia_id UUID NOT NULL,
  
  -- Identificação
  data_implantacao DATE,
  data_vistoria DATE NOT NULL,
  foto_identificacao_url TEXT,
  codigo TEXT,
  modelo TEXT,
  tipo TEXT,
  velocidade TEXT,
  descricao TEXT,
  
  -- Localização
  uf TEXT,
  br TEXT,
  snv TEXT,
  km NUMERIC,
  lado TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  
  -- Dados da Placa - Características
  suporte TEXT,
  qtde_suporte INTEGER,
  substrato TEXT,
  pelicula TEXT,
  altura_m NUMERIC,
  distancia_m NUMERIC,
  dimensoes_mm TEXT,
  area_m2 NUMERIC,
  retrorrefletividade NUMERIC,
  
  -- Documentação Fotográfica
  foto_frontal_url TEXT,
  foto_lateral_url TEXT,
  foto_posterior_url TEXT,
  foto_base_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for damage records
CREATE TABLE public.ficha_placa_danos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ficha_placa_id UUID NOT NULL REFERENCES public.ficha_placa(id) ON DELETE CASCADE,
  problema TEXT NOT NULL,
  data_ocorrencia DATE NOT NULL,
  vandalismo BOOLEAN DEFAULT false,
  solucao TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for intervention records
CREATE TABLE public.ficha_placa_intervencoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ficha_placa_id UUID NOT NULL REFERENCES public.ficha_placa(id) ON DELETE CASCADE,
  motivo TEXT NOT NULL,
  data_intervencao DATE NOT NULL,
  placa_recuperada BOOLEAN DEFAULT false,
  suporte TEXT,
  substrato TEXT,
  pelicula TEXT,
  retro_fundo NUMERIC,
  retro_orla_legenda NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ficha_placa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ficha_placa_danos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ficha_placa_intervencoes ENABLE ROW LEVEL SECURITY;

-- Create policies for ficha_placa
CREATE POLICY "Users can view their own fichas placa"
ON public.ficha_placa
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own fichas placa"
ON public.ficha_placa
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fichas placa"
ON public.ficha_placa
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fichas placa"
ON public.ficha_placa
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores can view all fichas placa"
ON public.ficha_placa
FOR SELECT
USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create policies for ficha_placa_danos
CREATE POLICY "Users can view danos of their own fichas placa"
ON public.ficha_placa_danos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ficha_placa
    WHERE id = ficha_placa_danos.ficha_placa_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create danos for their own fichas placa"
ON public.ficha_placa_danos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ficha_placa
    WHERE id = ficha_placa_danos.ficha_placa_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update danos of their own fichas placa"
ON public.ficha_placa_danos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.ficha_placa
    WHERE id = ficha_placa_danos.ficha_placa_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete danos of their own fichas placa"
ON public.ficha_placa_danos
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.ficha_placa
    WHERE id = ficha_placa_danos.ficha_placa_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Coordenadores can view all danos"
ON public.ficha_placa_danos
FOR SELECT
USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create policies for ficha_placa_intervencoes
CREATE POLICY "Users can view intervencoes of their own fichas placa"
ON public.ficha_placa_intervencoes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ficha_placa
    WHERE id = ficha_placa_intervencoes.ficha_placa_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create intervencoes for their own fichas placa"
ON public.ficha_placa_intervencoes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ficha_placa
    WHERE id = ficha_placa_intervencoes.ficha_placa_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update intervencoes of their own fichas placa"
ON public.ficha_placa_intervencoes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.ficha_placa
    WHERE id = ficha_placa_intervencoes.ficha_placa_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete intervencoes of their own fichas placa"
ON public.ficha_placa_intervencoes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.ficha_placa
    WHERE id = ficha_placa_intervencoes.ficha_placa_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Coordenadores can view all intervencoes"
ON public.ficha_placa_intervencoes
FOR SELECT
USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ficha_placa_updated_at
BEFORE UPDATE ON public.ficha_placa
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();