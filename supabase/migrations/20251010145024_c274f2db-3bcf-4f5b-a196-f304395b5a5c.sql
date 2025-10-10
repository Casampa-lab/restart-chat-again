-- Create table for intervencoes_marcas_transversais
CREATE TABLE public.intervencoes_marcas_transversais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lote_id UUID NOT NULL,
  rodovia_id UUID NOT NULL,
  data_intervencao DATE NOT NULL,
  km_inicial NUMERIC NOT NULL,
  km_final NUMERIC NOT NULL,
  tipo_intervencao TEXT NOT NULL,
  tipo_demarcacao TEXT NOT NULL,
  cor TEXT NOT NULL,
  area_m2 NUMERIC NOT NULL,
  material_utilizado TEXT,
  espessura_cm NUMERIC,
  latitude_inicial NUMERIC,
  longitude_inicial NUMERIC,
  latitude_final NUMERIC,
  longitude_final NUMERIC,
  observacao TEXT,
  enviado_coordenador BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.intervencoes_marcas_transversais ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own intervencoes marcas transversais" 
ON public.intervencoes_marcas_transversais 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own intervencoes marcas transversais" 
ON public.intervencoes_marcas_transversais 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own intervencoes marcas transversais" 
ON public.intervencoes_marcas_transversais 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own intervencoes marcas transversais" 
ON public.intervencoes_marcas_transversais 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores can view all intervencoes marcas transversais" 
ON public.intervencoes_marcas_transversais 
FOR SELECT 
USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_intervencoes_marcas_transversais_updated_at
BEFORE UPDATE ON public.intervencoes_marcas_transversais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();