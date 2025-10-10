-- Criar tabela para inventário de Marcas Longitudinais (SH)
CREATE TABLE IF NOT EXISTS public.ficha_marcas_longitudinais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lote_id UUID NOT NULL,
  rodovia_id UUID NOT NULL,
  data_vistoria DATE NOT NULL,
  km_inicial NUMERIC,
  km_final NUMERIC,
  latitude_inicial NUMERIC,
  longitude_inicial NUMERIC,
  latitude_final NUMERIC,
  longitude_final NUMERIC,
  tipo_demarcacao TEXT,
  cor TEXT,
  largura_cm NUMERIC,
  extensao_metros NUMERIC,
  espessura_cm NUMERIC,
  material TEXT,
  estado_conservacao TEXT,
  observacao TEXT,
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  enviado_coordenador BOOLEAN DEFAULT false
);

-- Criar tabela para inventário de Inscrições (Setas, Símbolos e Legendas)
CREATE TABLE IF NOT EXISTS public.ficha_inscricoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lote_id UUID NOT NULL,
  rodovia_id UUID NOT NULL,
  data_vistoria DATE NOT NULL,
  km_inicial NUMERIC,
  km_final NUMERIC,
  latitude_inicial NUMERIC,
  longitude_inicial NUMERIC,
  latitude_final NUMERIC,
  longitude_final NUMERIC,
  tipo_inscricao TEXT NOT NULL,
  cor TEXT NOT NULL,
  dimensoes TEXT,
  area_m2 NUMERIC,
  material_utilizado TEXT,
  estado_conservacao TEXT,
  observacao TEXT,
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  enviado_coordenador BOOLEAN DEFAULT false
);

-- Criar tabela para inventário de Tachas
CREATE TABLE IF NOT EXISTS public.ficha_tachas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lote_id UUID NOT NULL,
  rodovia_id UUID NOT NULL,
  data_vistoria DATE NOT NULL,
  km_inicial NUMERIC NOT NULL,
  km_final NUMERIC NOT NULL,
  latitude_inicial NUMERIC,
  longitude_inicial NUMERIC,
  latitude_final NUMERIC,
  longitude_final NUMERIC,
  tipo_tacha TEXT NOT NULL,
  cor TEXT NOT NULL,
  lado TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  material TEXT,
  estado_conservacao TEXT,
  observacao TEXT,
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  enviado_coordenador BOOLEAN DEFAULT false
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.ficha_marcas_longitudinais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ficha_inscricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ficha_tachas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para ficha_marcas_longitudinais
CREATE POLICY "Users can view their own marcas longitudinais"
  ON public.ficha_marcas_longitudinais FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own marcas longitudinais"
  ON public.ficha_marcas_longitudinais FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own marcas longitudinais"
  ON public.ficha_marcas_longitudinais FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own marcas longitudinais"
  ON public.ficha_marcas_longitudinais FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores can view all marcas longitudinais"
  ON public.ficha_marcas_longitudinais FOR SELECT
  USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Políticas RLS para ficha_inscricoes
CREATE POLICY "Users can view their own inscricoes"
  ON public.ficha_inscricoes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own inscricoes"
  ON public.ficha_inscricoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inscricoes"
  ON public.ficha_inscricoes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inscricoes"
  ON public.ficha_inscricoes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores can view all inscricoes"
  ON public.ficha_inscricoes FOR SELECT
  USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Políticas RLS para ficha_tachas
CREATE POLICY "Users can view their own tachas"
  ON public.ficha_tachas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tachas"
  ON public.ficha_tachas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tachas"
  ON public.ficha_tachas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tachas"
  ON public.ficha_tachas FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores can view all tachas"
  ON public.ficha_tachas FOR SELECT
  USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Criar triggers para updated_at
CREATE TRIGGER update_ficha_marcas_longitudinais_updated_at
  BEFORE UPDATE ON public.ficha_marcas_longitudinais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ficha_inscricoes_updated_at
  BEFORE UPDATE ON public.ficha_inscricoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ficha_tachas_updated_at
  BEFORE UPDATE ON public.ficha_tachas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();