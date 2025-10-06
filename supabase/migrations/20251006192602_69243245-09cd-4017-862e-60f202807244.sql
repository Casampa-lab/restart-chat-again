-- Create storage bucket for verification photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('verificacao-photos', 'verificacao-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for verification photos
CREATE POLICY "Users can view verification photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'verificacao-photos');

CREATE POLICY "Users can upload their own verification photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verificacao-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own verification photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'verificacao-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own verification photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'verificacao-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create table for verification sheets
CREATE TABLE public.ficha_verificacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lote_id UUID NOT NULL,
  rodovia_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Sinalização Horizontal', 'Sinalização Vertical')),
  contrato TEXT,
  empresa TEXT,
  snv TEXT,
  data_verificacao DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for verification items (each photo point)
CREATE TABLE public.ficha_verificacao_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ficha_id UUID NOT NULL REFERENCES public.ficha_verificacao(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL CHECK (ordem >= 1 AND ordem <= 3),
  foto_url TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  sentido TEXT,
  km NUMERIC,
  
  -- Campos específicos para Sinalização Horizontal
  largura_cm NUMERIC,
  largura_conforme BOOLEAN,
  largura_obs TEXT,
  retro_bd NUMERIC,
  retro_bd_conforme BOOLEAN,
  retro_bd_obs TEXT,
  retro_e NUMERIC,
  retro_e_conforme BOOLEAN,
  retro_e_obs TEXT,
  retro_be NUMERIC,
  retro_be_conforme BOOLEAN,
  retro_be_obs TEXT,
  marcas TEXT,
  marcas_conforme BOOLEAN,
  marcas_obs TEXT,
  material TEXT,
  material_conforme BOOLEAN,
  material_obs TEXT,
  tachas TEXT,
  tachas_conforme BOOLEAN,
  tachas_obs TEXT,
  data_implantacao DATE,
  data_implantacao_conforme BOOLEAN,
  data_implantacao_obs TEXT,
  
  -- Campos específicos para Sinalização Vertical
  altura_m NUMERIC,
  altura_conforme BOOLEAN,
  altura_obs TEXT,
  afastamento_m NUMERIC,
  afastamento_conforme BOOLEAN,
  afastamento_obs TEXT,
  dimensoes_m TEXT,
  dimensoes_conforme BOOLEAN,
  dimensoes_obs TEXT,
  letra_mm NUMERIC,
  letra_conforme BOOLEAN,
  letra_obs TEXT,
  data_imp_verso BOOLEAN,
  data_imp_verso_conforme BOOLEAN,
  data_imp_verso_obs TEXT,
  retro_sv NUMERIC,
  retro_sv_conforme BOOLEAN,
  retro_sv_obs TEXT,
  substrato TEXT,
  substrato_conforme BOOLEAN,
  substrato_obs TEXT,
  pelicula TEXT,
  pelicula_conforme BOOLEAN,
  pelicula_obs TEXT,
  suporte TEXT,
  suporte_conforme BOOLEAN,
  suporte_obs TEXT,
  qtde_suporte INTEGER,
  qtde_suporte_conforme BOOLEAN,
  qtde_suporte_obs TEXT,
  tipo_placa TEXT,
  tipo_placa_conforme BOOLEAN,
  tipo_placa_obs TEXT,
  
  -- Campo comum
  velocidade TEXT,
  velocidade_conforme BOOLEAN,
  velocidade_obs TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ficha_id, ordem)
);

-- Enable Row Level Security
ALTER TABLE public.ficha_verificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ficha_verificacao_itens ENABLE ROW LEVEL SECURITY;

-- Create policies for ficha_verificacao
CREATE POLICY "Users can view their own fichas"
ON public.ficha_verificacao
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own fichas"
ON public.ficha_verificacao
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fichas"
ON public.ficha_verificacao
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fichas"
ON public.ficha_verificacao
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores can view all fichas"
ON public.ficha_verificacao
FOR SELECT
USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create policies for ficha_verificacao_itens
CREATE POLICY "Users can view items of their own fichas"
ON public.ficha_verificacao_itens
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ficha_verificacao
    WHERE id = ficha_verificacao_itens.ficha_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create items for their own fichas"
ON public.ficha_verificacao_itens
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ficha_verificacao
    WHERE id = ficha_verificacao_itens.ficha_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update items of their own fichas"
ON public.ficha_verificacao_itens
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.ficha_verificacao
    WHERE id = ficha_verificacao_itens.ficha_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete items of their own fichas"
ON public.ficha_verificacao_itens
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.ficha_verificacao
    WHERE id = ficha_verificacao_itens.ficha_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Coordenadores can view all ficha items"
ON public.ficha_verificacao_itens
FOR SELECT
USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ficha_verificacao_updated_at
BEFORE UPDATE ON public.ficha_verificacao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();