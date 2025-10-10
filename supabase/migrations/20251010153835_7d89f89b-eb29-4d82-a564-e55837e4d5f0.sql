-- Criar tabela para cadastro de cilindros delimitadores
CREATE TABLE public.intervencoes_cilindros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lote_id UUID NOT NULL,
  rodovia_id UUID NOT NULL,
  data_intervencao DATE NOT NULL,
  snv TEXT,
  cor_corpo TEXT NOT NULL,
  cor_refletivo TEXT,
  tipo_refletivo TEXT,
  km_inicial NUMERIC NOT NULL,
  latitude_inicial NUMERIC,
  longitude_inicial NUMERIC,
  km_final NUMERIC NOT NULL,
  latitude_final NUMERIC,
  longitude_final NUMERIC,
  extensao_km NUMERIC,
  local_implantacao TEXT,
  espacamento_m NUMERIC,
  quantidade INTEGER,
  observacao TEXT,
  enviado_coordenador BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.intervencoes_cilindros ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can create their own cilindros"
  ON public.intervencoes_cilindros
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own cilindros"
  ON public.intervencoes_cilindros
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own cilindros"
  ON public.intervencoes_cilindros
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cilindros"
  ON public.intervencoes_cilindros
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores can view all cilindros"
  ON public.intervencoes_cilindros
  FOR SELECT
  USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_intervencoes_cilindros_updated_at
  BEFORE UPDATE ON public.intervencoes_cilindros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();