-- Create table for ficha_marcas_transversais (inventory)
CREATE TABLE public.ficha_marcas_transversais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lote_id UUID NOT NULL,
  rodovia_id UUID NOT NULL,
  data_vistoria DATE NOT NULL,
  km_inicial NUMERIC,
  km_final NUMERIC,
  tipo_demarcacao TEXT,
  cor TEXT,
  material TEXT,
  espessura_cm NUMERIC,
  largura_cm NUMERIC,
  estado_conservacao TEXT,
  latitude_inicial NUMERIC,
  longitude_inicial NUMERIC,
  latitude_final NUMERIC,
  longitude_final NUMERIC,
  observacao TEXT,
  foto_url TEXT,
  enviado_coordenador BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ficha_marcas_transversais ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own marcas transversais" 
ON public.ficha_marcas_transversais 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own marcas transversais" 
ON public.ficha_marcas_transversais 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own marcas transversais" 
ON public.ficha_marcas_transversais 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own marcas transversais" 
ON public.ficha_marcas_transversais 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores can view all marcas transversais" 
ON public.ficha_marcas_transversais 
FOR SELECT 
USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ficha_marcas_transversais_updated_at
BEFORE UPDATE ON public.ficha_marcas_transversais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for interventions on marcas transversais
CREATE TABLE public.ficha_marcas_transversais_intervencoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ficha_marcas_transversais_id UUID NOT NULL,
  data_intervencao DATE NOT NULL,
  motivo TEXT NOT NULL,
  tipo_demarcacao TEXT,
  cor TEXT,
  material TEXT,
  espessura_cm NUMERIC,
  largura_cm NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for interventions
ALTER TABLE public.ficha_marcas_transversais_intervencoes ENABLE ROW LEVEL SECURITY;

-- Create policies for interventions
CREATE POLICY "Users can view intervencoes of their own marcas transversais" 
ON public.ficha_marcas_transversais_intervencoes 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM ficha_marcas_transversais
  WHERE ficha_marcas_transversais.id = ficha_marcas_transversais_intervencoes.ficha_marcas_transversais_id
  AND ficha_marcas_transversais.user_id = auth.uid()
));

CREATE POLICY "Users can create intervencoes for marcas transversais" 
ON public.ficha_marcas_transversais_intervencoes 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM ficha_marcas_transversais
  WHERE ficha_marcas_transversais.id = ficha_marcas_transversais_intervencoes.ficha_marcas_transversais_id
  AND (ficha_marcas_transversais.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordenador'::app_role))
));

CREATE POLICY "Coordenadores can view all marcas transversais intervencoes" 
ON public.ficha_marcas_transversais_intervencoes 
FOR SELECT 
USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));