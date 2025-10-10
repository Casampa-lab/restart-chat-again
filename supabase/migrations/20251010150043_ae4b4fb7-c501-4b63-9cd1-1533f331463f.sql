-- Create table for ficha_porticos (Pórticos, Semipórticos e Braços Projetados)
CREATE TABLE public.ficha_porticos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lote_id UUID NOT NULL,
  rodovia_id UUID NOT NULL,
  data_vistoria DATE NOT NULL,
  snv TEXT,
  tipo TEXT NOT NULL,
  altura_livre_m NUMERIC,
  vao_horizontal_m NUMERIC,
  lado TEXT,
  km NUMERIC,
  latitude NUMERIC,
  longitude NUMERIC,
  estado_conservacao TEXT,
  observacao TEXT,
  foto_url TEXT,
  enviado_coordenador BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ficha_porticos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own porticos" 
ON public.ficha_porticos 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own porticos" 
ON public.ficha_porticos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own porticos" 
ON public.ficha_porticos 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own porticos" 
ON public.ficha_porticos 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores can view all porticos" 
ON public.ficha_porticos 
FOR SELECT 
USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ficha_porticos_updated_at
BEFORE UPDATE ON public.ficha_porticos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for interventions on porticos
CREATE TABLE public.ficha_porticos_intervencoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ficha_porticos_id UUID NOT NULL,
  data_intervencao DATE NOT NULL,
  motivo TEXT NOT NULL,
  tipo TEXT,
  altura_livre_m NUMERIC,
  vao_horizontal_m NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for interventions
ALTER TABLE public.ficha_porticos_intervencoes ENABLE ROW LEVEL SECURITY;

-- Create policies for interventions
CREATE POLICY "Users can view intervencoes of their own porticos" 
ON public.ficha_porticos_intervencoes 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM ficha_porticos
  WHERE ficha_porticos.id = ficha_porticos_intervencoes.ficha_porticos_id
  AND ficha_porticos.user_id = auth.uid()
));

CREATE POLICY "Users can create intervencoes for porticos" 
ON public.ficha_porticos_intervencoes 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM ficha_porticos
  WHERE ficha_porticos.id = ficha_porticos_intervencoes.ficha_porticos_id
  AND (ficha_porticos.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordenador'::app_role))
));

CREATE POLICY "Coordenadores can view all porticos intervencoes" 
ON public.ficha_porticos_intervencoes 
FOR SELECT 
USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));