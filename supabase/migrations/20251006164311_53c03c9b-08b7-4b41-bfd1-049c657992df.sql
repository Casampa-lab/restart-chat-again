-- Create table for retrorrefletividade estatica
CREATE TABLE public.retrorrefletividade_estatica (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lote_id UUID NOT NULL,
  rodovia_id UUID NOT NULL,
  data_medicao DATE NOT NULL,
  km_referencia NUMERIC NOT NULL,
  lado TEXT NOT NULL,
  tipo_dispositivo TEXT NOT NULL,
  codigo_dispositivo TEXT,
  valor_medido NUMERIC NOT NULL,
  valor_minimo NUMERIC NOT NULL,
  situacao TEXT NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.retrorrefletividade_estatica ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own retrorrefletividade" 
ON public.retrorrefletividade_estatica 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own retrorrefletividade" 
ON public.retrorrefletividade_estatica 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own retrorrefletividade" 
ON public.retrorrefletividade_estatica 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own retrorrefletividade" 
ON public.retrorrefletividade_estatica 
FOR DELETE 
USING (auth.uid() = user_id);

-- Coordenadores can view all retrorrefletividade
CREATE POLICY "Coordenadores can view all retrorrefletividade" 
ON public.retrorrefletividade_estatica 
FOR SELECT 
USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_retrorrefletividade_estatica_updated_at
BEFORE UPDATE ON public.retrorrefletividade_estatica
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();