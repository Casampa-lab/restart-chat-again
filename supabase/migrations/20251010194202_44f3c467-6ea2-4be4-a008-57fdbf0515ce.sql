-- Criar tabela de inventário de cilindros (ficha_cilindros)
CREATE TABLE IF NOT EXISTS public.ficha_cilindros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lote_id UUID NOT NULL,
  rodovia_id UUID NOT NULL,
  data_vistoria DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Campos do dicionário de dados
  snv TEXT,
  cor_corpo TEXT NOT NULL,
  cor_refletivo TEXT,
  tipo_refletivo TEXT,
  km_inicial NUMERIC NOT NULL DEFAULT 0,
  km_final NUMERIC NOT NULL DEFAULT 0,
  latitude_inicial NUMERIC,
  longitude_inicial NUMERIC,
  latitude_final NUMERIC,
  longitude_final NUMERIC,
  extensao_km NUMERIC,
  local_implantacao TEXT,
  espacamento_m NUMERIC,
  quantidade INTEGER,
  observacao TEXT,
  foto_url TEXT,
  
  enviado_coordenador BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de intervenções em cilindros (ficha_cilindros_intervencoes)
CREATE TABLE IF NOT EXISTS public.ficha_cilindros_intervencoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ficha_cilindros_id UUID NOT NULL,
  data_intervencao DATE NOT NULL,
  motivo TEXT NOT NULL,
  cor_corpo TEXT,
  cor_refletivo TEXT,
  tipo_refletivo TEXT,
  quantidade INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de intervenções em defensas (se não existe)
CREATE TABLE IF NOT EXISTS public.defensas_intervencoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  defensa_id UUID NOT NULL,
  data_intervencao DATE NOT NULL,
  motivo TEXT NOT NULL,
  tipo_defensa TEXT,
  extensao_metros NUMERIC,
  estado_conservacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ficha_cilindros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ficha_cilindros_intervencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defensas_intervencoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies para ficha_cilindros
CREATE POLICY "Users can view their own cilindros"
  ON public.ficha_cilindros FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cilindros"
  ON public.ficha_cilindros FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cilindros"
  ON public.ficha_cilindros FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cilindros"
  ON public.ficha_cilindros FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores can view all cilindros"
  ON public.ficha_cilindros FOR SELECT
  USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies para ficha_cilindros_intervencoes
CREATE POLICY "Users can view intervencoes of their own cilindros"
  ON public.ficha_cilindros_intervencoes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM ficha_cilindros
    WHERE ficha_cilindros.id = ficha_cilindros_intervencoes.ficha_cilindros_id
    AND ficha_cilindros.user_id = auth.uid()
  ));

CREATE POLICY "Users can create intervencoes for cilindros"
  ON public.ficha_cilindros_intervencoes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM ficha_cilindros
    WHERE ficha_cilindros.id = ficha_cilindros_intervencoes.ficha_cilindros_id
    AND (ficha_cilindros.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordenador'::app_role))
  ));

CREATE POLICY "Coordenadores can view all cilindros intervencoes"
  ON public.ficha_cilindros_intervencoes FOR SELECT
  USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies para defensas_intervencoes
CREATE POLICY "Users can view intervencoes of their own defensas"
  ON public.defensas_intervencoes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM defensas
    WHERE defensas.id = defensas_intervencoes.defensa_id
    AND defensas.user_id = auth.uid()
  ));

CREATE POLICY "Users can create intervencoes for defensas"
  ON public.defensas_intervencoes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM defensas
    WHERE defensas.id = defensas_intervencoes.defensa_id
    AND (defensas.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordenador'::app_role))
  ));

CREATE POLICY "Coordenadores can view all defensas intervencoes"
  ON public.defensas_intervencoes FOR SELECT
  USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Migrar dados existentes de intervencoes_cilindros para ficha_cilindros
INSERT INTO public.ficha_cilindros (
  user_id, lote_id, rodovia_id, data_vistoria,
  snv, cor_corpo, cor_refletivo, tipo_refletivo,
  km_inicial, km_final, latitude_inicial, longitude_inicial,
  latitude_final, longitude_final, extensao_km, local_implantacao,
  espacamento_m, quantidade, observacao, enviado_coordenador,
  created_at, updated_at
)
SELECT 
  user_id, lote_id, rodovia_id, data_intervencao as data_vistoria,
  snv, cor_corpo, cor_refletivo, tipo_refletivo,
  km_inicial, km_final, latitude_inicial, longitude_inicial,
  latitude_final, longitude_final, extensao_km, local_implantacao,
  espacamento_m, quantidade, observacao, enviado_coordenador,
  created_at, updated_at
FROM public.intervencoes_cilindros
ON CONFLICT DO NOTHING;