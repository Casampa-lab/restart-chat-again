-- Create table for defensas metalicas
CREATE TABLE public.defensas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lote_id UUID NOT NULL,
  rodovia_id UUID NOT NULL,
  data_inspecao DATE NOT NULL,
  km_inicial NUMERIC NOT NULL,
  km_final NUMERIC NOT NULL,
  lado TEXT NOT NULL,
  tipo_defensa TEXT NOT NULL,
  extensao_metros NUMERIC NOT NULL,
  estado_conservacao TEXT NOT NULL,
  tipo_avaria TEXT,
  necessita_intervencao BOOLEAN NOT NULL DEFAULT false,
  nivel_risco TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.defensas ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own defensas" 
ON public.defensas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own defensas" 
ON public.defensas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own defensas" 
ON public.defensas 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own defensas" 
ON public.defensas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Coordenadores can view all defensas
CREATE POLICY "Coordenadores can view all defensas" 
ON public.defensas 
FOR SELECT 
USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_defensas_updated_at
BEFORE UPDATE ON public.defensas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();