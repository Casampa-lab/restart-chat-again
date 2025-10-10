-- Create table for intervencoes_porticos
CREATE TABLE public.intervencoes_porticos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lote_id UUID NOT NULL,
  rodovia_id UUID NOT NULL,
  data_intervencao DATE NOT NULL,
  km NUMERIC NOT NULL,
  tipo_intervencao TEXT NOT NULL,
  tipo TEXT NOT NULL,
  lado TEXT,
  altura_livre_m NUMERIC,
  vao_horizontal_m NUMERIC,
  snv TEXT,
  estado_conservacao TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  observacao TEXT,
  enviado_coordenador BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.intervencoes_porticos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own intervencoes porticos" 
ON public.intervencoes_porticos 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own intervencoes porticos" 
ON public.intervencoes_porticos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own intervencoes porticos" 
ON public.intervencoes_porticos 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own intervencoes porticos" 
ON public.intervencoes_porticos 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores can view all intervencoes porticos" 
ON public.intervencoes_porticos 
FOR SELECT 
USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_intervencoes_porticos_updated_at
BEFORE UPDATE ON public.intervencoes_porticos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();