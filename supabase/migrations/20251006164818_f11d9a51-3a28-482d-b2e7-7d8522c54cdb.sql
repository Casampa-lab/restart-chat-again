-- Create table for retrorrefletividade dinamica
CREATE TABLE public.retrorrefletividade_dinamica (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lote_id UUID NOT NULL,
  rodovia_id UUID NOT NULL,
  data_medicao DATE NOT NULL,
  km_inicial NUMERIC NOT NULL,
  km_final NUMERIC NOT NULL,
  faixa TEXT NOT NULL,
  tipo_demarcacao TEXT NOT NULL,
  cor TEXT NOT NULL,
  valor_medido NUMERIC NOT NULL,
  valor_minimo NUMERIC NOT NULL,
  situacao TEXT NOT NULL,
  velocidade_medicao NUMERIC,
  condicao_climatica TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.retrorrefletividade_dinamica ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own retrorrefletividade dinamica" 
ON public.retrorrefletividade_dinamica 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own retrorrefletividade dinamica" 
ON public.retrorrefletividade_dinamica 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own retrorrefletividade dinamica" 
ON public.retrorrefletividade_dinamica 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own retrorrefletividade dinamica" 
ON public.retrorrefletividade_dinamica 
FOR DELETE 
USING (auth.uid() = user_id);

-- Coordenadores can view all retrorrefletividade dinamica
CREATE POLICY "Coordenadores can view all retrorrefletividade dinamica" 
ON public.retrorrefletividade_dinamica 
FOR SELECT 
USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_retrorrefletividade_dinamica_updated_at
BEFORE UPDATE ON public.retrorrefletividade_dinamica
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();