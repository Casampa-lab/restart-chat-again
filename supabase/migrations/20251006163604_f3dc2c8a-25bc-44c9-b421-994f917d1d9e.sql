-- Create table for frentes liberadas (released fronts)
CREATE TABLE public.frentes_liberadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lote_id UUID NOT NULL,
  rodovia_id UUID NOT NULL,
  data_liberacao DATE NOT NULL,
  km_inicial NUMERIC NOT NULL,
  km_final NUMERIC NOT NULL,
  tipo_servico TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.frentes_liberadas ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own frentes liberadas" 
ON public.frentes_liberadas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own frentes liberadas" 
ON public.frentes_liberadas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own frentes liberadas" 
ON public.frentes_liberadas 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own frentes liberadas" 
ON public.frentes_liberadas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Coordenadores can view all frentes liberadas
CREATE POLICY "Coordenadores can view all frentes liberadas" 
ON public.frentes_liberadas 
FOR SELECT 
USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_frentes_liberadas_updated_at
BEFORE UPDATE ON public.frentes_liberadas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();