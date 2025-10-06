-- Criar tabela para intervenções em sinalização vertical
CREATE TABLE public.intervencoes_sv (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lote_id UUID NOT NULL,
  rodovia_id UUID NOT NULL,
  data_intervencao DATE NOT NULL,
  km_referencia NUMERIC NOT NULL,
  tipo_intervencao TEXT NOT NULL,
  tipo_placa TEXT NOT NULL,
  codigo_placa TEXT,
  lado TEXT NOT NULL,
  dimensoes TEXT,
  material TEXT,
  tipo_suporte TEXT,
  estado_conservacao TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.intervencoes_sv ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para usuários
CREATE POLICY "Users can view their own intervencoes sv"
  ON public.intervencoes_sv
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own intervencoes sv"
  ON public.intervencoes_sv
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own intervencoes sv"
  ON public.intervencoes_sv
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own intervencoes sv"
  ON public.intervencoes_sv
  FOR DELETE
  USING (auth.uid() = user_id);

-- Política para coordenadores e admins
CREATE POLICY "Coordenadores can view all intervencoes sv"
  ON public.intervencoes_sv
  FOR SELECT
  USING (
    has_role(auth.uid(), 'coordenador'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_intervencoes_sv_updated_at
  BEFORE UPDATE ON public.intervencoes_sv
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();