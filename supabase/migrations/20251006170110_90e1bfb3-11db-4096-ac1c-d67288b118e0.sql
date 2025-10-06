-- Create table for intervencoes inscricoes pavimentos
CREATE TABLE public.intervencoes_inscricoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lote_id UUID NOT NULL,
  rodovia_id UUID NOT NULL,
  data_intervencao DATE NOT NULL,
  km_inicial NUMERIC NOT NULL,
  km_final NUMERIC NOT NULL,
  tipo_intervencao TEXT NOT NULL,
  tipo_inscricao TEXT NOT NULL,
  cor TEXT NOT NULL,
  dimensoes TEXT,
  area_m2 NUMERIC NOT NULL,
  material_utilizado TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.intervencoes_inscricoes ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own intervencoes inscricoes" 
ON public.intervencoes_inscricoes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own intervencoes inscricoes" 
ON public.intervencoes_inscricoes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own intervencoes inscricoes" 
ON public.intervencoes_inscricoes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own intervencoes inscricoes" 
ON public.intervencoes_inscricoes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Coordenadores can view all intervencoes inscricoes
CREATE POLICY "Coordenadores can view all intervencoes inscricoes" 
ON public.intervencoes_inscricoes 
FOR SELECT 
USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_intervencoes_inscricoes_updated_at
BEFORE UPDATE ON public.intervencoes_inscricoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();