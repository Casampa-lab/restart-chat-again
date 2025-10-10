-- Criar tabela de histórico para Marcas Longitudinais
CREATE TABLE IF NOT EXISTS public.ficha_marcas_longitudinais_intervencoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ficha_marcas_longitudinais_id UUID NOT NULL,
  data_intervencao DATE NOT NULL,
  motivo TEXT NOT NULL,
  tipo_demarcacao TEXT,
  cor TEXT,
  largura_cm NUMERIC,
  espessura_cm NUMERIC,
  material TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de histórico para Inscrições
CREATE TABLE IF NOT EXISTS public.ficha_inscricoes_intervencoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ficha_inscricoes_id UUID NOT NULL,
  data_intervencao DATE NOT NULL,
  motivo TEXT NOT NULL,
  tipo_inscricao TEXT,
  cor TEXT,
  dimensoes TEXT,
  area_m2 NUMERIC,
  material_utilizado TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de histórico para Tachas
CREATE TABLE IF NOT EXISTS public.ficha_tachas_intervencoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ficha_tachas_id UUID NOT NULL,
  data_intervencao DATE NOT NULL,
  motivo TEXT NOT NULL,
  tipo_tacha TEXT,
  cor TEXT,
  lado TEXT,
  quantidade INTEGER,
  material TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ficha_marcas_longitudinais_intervencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ficha_inscricoes_intervencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ficha_tachas_intervencoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para ficha_marcas_longitudinais_intervencoes
CREATE POLICY "Users can view intervencoes of their own marcas longitudinais"
  ON public.ficha_marcas_longitudinais_intervencoes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ficha_marcas_longitudinais
    WHERE ficha_marcas_longitudinais.id = ficha_marcas_longitudinais_intervencoes.ficha_marcas_longitudinais_id
      AND ficha_marcas_longitudinais.user_id = auth.uid()
  ));

CREATE POLICY "Users can create intervencoes for marcas longitudinais"
  ON public.ficha_marcas_longitudinais_intervencoes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ficha_marcas_longitudinais
    WHERE ficha_marcas_longitudinais.id = ficha_marcas_longitudinais_intervencoes.ficha_marcas_longitudinais_id
      AND (ficha_marcas_longitudinais.user_id = auth.uid() 
           OR has_role(auth.uid(), 'admin'::app_role) 
           OR has_role(auth.uid(), 'coordenador'::app_role))
  ));

CREATE POLICY "Coordenadores can view all marcas longitudinais intervencoes"
  ON public.ficha_marcas_longitudinais_intervencoes FOR SELECT
  USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Políticas RLS para ficha_inscricoes_intervencoes
CREATE POLICY "Users can view intervencoes of their own inscricoes"
  ON public.ficha_inscricoes_intervencoes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ficha_inscricoes
    WHERE ficha_inscricoes.id = ficha_inscricoes_intervencoes.ficha_inscricoes_id
      AND ficha_inscricoes.user_id = auth.uid()
  ));

CREATE POLICY "Users can create intervencoes for inscricoes"
  ON public.ficha_inscricoes_intervencoes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ficha_inscricoes
    WHERE ficha_inscricoes.id = ficha_inscricoes_intervencoes.ficha_inscricoes_id
      AND (ficha_inscricoes.user_id = auth.uid() 
           OR has_role(auth.uid(), 'admin'::app_role) 
           OR has_role(auth.uid(), 'coordenador'::app_role))
  ));

CREATE POLICY "Coordenadores can view all inscricoes intervencoes"
  ON public.ficha_inscricoes_intervencoes FOR SELECT
  USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Políticas RLS para ficha_tachas_intervencoes
CREATE POLICY "Users can view intervencoes of their own tachas"
  ON public.ficha_tachas_intervencoes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ficha_tachas
    WHERE ficha_tachas.id = ficha_tachas_intervencoes.ficha_tachas_id
      AND ficha_tachas.user_id = auth.uid()
  ));

CREATE POLICY "Users can create intervencoes for tachas"
  ON public.ficha_tachas_intervencoes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ficha_tachas
    WHERE ficha_tachas.id = ficha_tachas_intervencoes.ficha_tachas_id
      AND (ficha_tachas.user_id = auth.uid() 
           OR has_role(auth.uid(), 'admin'::app_role) 
           OR has_role(auth.uid(), 'coordenador'::app_role))
  ));

CREATE POLICY "Coordenadores can view all tachas intervencoes"
  ON public.ficha_tachas_intervencoes FOR SELECT
  USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));