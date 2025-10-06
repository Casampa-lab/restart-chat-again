-- Create table for tachas interventions
CREATE TABLE public.intervencoes_tacha (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lote_id UUID NOT NULL,
  rodovia_id UUID NOT NULL,
  user_id UUID NOT NULL,
  data_intervencao DATE NOT NULL,
  km_inicial NUMERIC NOT NULL,
  km_final NUMERIC NOT NULL,
  tipo_intervencao TEXT NOT NULL,
  tipo_tacha TEXT NOT NULL,
  cor TEXT NOT NULL,
  lado TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  estado_conservacao TEXT,
  material TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.intervencoes_tacha ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own intervencoes tacha"
ON public.intervencoes_tacha
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own intervencoes tacha"
ON public.intervencoes_tacha
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own intervencoes tacha"
ON public.intervencoes_tacha
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own intervencoes tacha"
ON public.intervencoes_tacha
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores can view all intervencoes tacha"
ON public.intervencoes_tacha
FOR SELECT
USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_intervencoes_tacha_updated_at
BEFORE UPDATE ON public.intervencoes_tacha
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();