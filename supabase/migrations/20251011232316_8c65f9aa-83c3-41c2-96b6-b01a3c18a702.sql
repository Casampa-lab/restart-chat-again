-- ============================================
-- FASE 1: Sistema de NECESSIDADES
-- Criação das 7 tabelas de necessidades
-- ============================================

-- 1. NECESSIDADES - MARCAS LONGITUDINAIS
CREATE TABLE public.necessidades_marcas_longitudinais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lote_id UUID NOT NULL REFERENCES public.lotes(id),
  rodovia_id UUID NOT NULL REFERENCES public.rodovias(id),
  
  -- Link ao CADASTRO (nullable - pode ser nova instalação)
  cadastro_id UUID REFERENCES public.ficha_marcas_longitudinais(id) ON DELETE SET NULL,
  
  -- SERVIÇO (auto-identificado na importação)
  servico TEXT NOT NULL CHECK (servico IN ('Inclusão', 'Substituição', 'Remoção')),
  
  -- Dados da planilha
  km_inicial NUMERIC,
  km_final NUMERIC,
  latitude_inicial NUMERIC,
  longitude_inicial NUMERIC,
  latitude_final NUMERIC,
  longitude_final NUMERIC,
  tipo_demarcacao TEXT,
  cor TEXT,
  material TEXT,
  largura_cm NUMERIC,
  espessura_cm NUMERIC,
  extensao_metros NUMERIC,
  estado_conservacao TEXT,
  observacao TEXT,
  snv TEXT,
  
  -- Metadados da importação
  data_importacao TIMESTAMP DEFAULT NOW(),
  arquivo_origem TEXT,
  linha_planilha INTEGER,
  distancia_match_metros NUMERIC,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. NECESSIDADES - TACHAS
CREATE TABLE public.necessidades_tachas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lote_id UUID NOT NULL REFERENCES public.lotes(id),
  rodovia_id UUID NOT NULL REFERENCES public.rodovias(id),
  
  cadastro_id UUID REFERENCES public.ficha_tachas(id) ON DELETE SET NULL,
  servico TEXT NOT NULL CHECK (servico IN ('Inclusão', 'Substituição', 'Remoção')),
  
  -- Dados da planilha
  km_inicial NUMERIC,
  km_final NUMERIC,
  latitude_inicial NUMERIC,
  longitude_inicial NUMERIC,
  latitude_final NUMERIC,
  longitude_final NUMERIC,
  quantidade INTEGER,
  corpo TEXT,
  refletivo TEXT,
  cor_refletivo TEXT,
  espacamento_m NUMERIC,
  extensao_km NUMERIC,
  local_implantacao TEXT,
  descricao TEXT,
  observacao TEXT,
  snv TEXT,
  
  data_importacao TIMESTAMP DEFAULT NOW(),
  arquivo_origem TEXT,
  linha_planilha INTEGER,
  distancia_match_metros NUMERIC,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. NECESSIDADES - MARCAS TRANSVERSAIS (ZEBRADOS)
CREATE TABLE public.necessidades_marcas_transversais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lote_id UUID NOT NULL REFERENCES public.lotes(id),
  rodovia_id UUID NOT NULL REFERENCES public.rodovias(id),
  
  cadastro_id UUID REFERENCES public.ficha_inscricoes(id) ON DELETE SET NULL,
  servico TEXT NOT NULL CHECK (servico IN ('Inclusão', 'Substituição', 'Remoção')),
  
  -- Dados da planilha
  km_inicial NUMERIC,
  km_final NUMERIC,
  latitude_inicial NUMERIC,
  longitude_inicial NUMERIC,
  latitude_final NUMERIC,
  longitude_final NUMERIC,
  tipo_inscricao TEXT,
  cor TEXT,
  dimensoes TEXT,
  area_m2 NUMERIC,
  material_utilizado TEXT,
  estado_conservacao TEXT,
  observacao TEXT,
  
  data_importacao TIMESTAMP DEFAULT NOW(),
  arquivo_origem TEXT,
  linha_planilha INTEGER,
  distancia_match_metros NUMERIC,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. NECESSIDADES - CILINDROS DELIMITADORES
CREATE TABLE public.necessidades_cilindros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lote_id UUID NOT NULL REFERENCES public.lotes(id),
  rodovia_id UUID NOT NULL REFERENCES public.rodovias(id),
  
  cadastro_id UUID REFERENCES public.ficha_cilindros(id) ON DELETE SET NULL,
  servico TEXT NOT NULL CHECK (servico IN ('Inclusão', 'Substituição', 'Remoção')),
  
  -- Dados da planilha
  km_inicial NUMERIC,
  km_final NUMERIC,
  latitude_inicial NUMERIC,
  longitude_inicial NUMERIC,
  latitude_final NUMERIC,
  longitude_final NUMERIC,
  quantidade INTEGER,
  cor_corpo TEXT,
  tipo_refletivo TEXT,
  cor_refletivo TEXT,
  espacamento_m NUMERIC,
  extensao_km NUMERIC,
  local_implantacao TEXT,
  observacao TEXT,
  snv TEXT,
  
  data_importacao TIMESTAMP DEFAULT NOW(),
  arquivo_origem TEXT,
  linha_planilha INTEGER,
  distancia_match_metros NUMERIC,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. NECESSIDADES - PLACAS
CREATE TABLE public.necessidades_placas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lote_id UUID NOT NULL REFERENCES public.lotes(id),
  rodovia_id UUID NOT NULL REFERENCES public.rodovias(id),
  
  cadastro_id UUID REFERENCES public.ficha_placa(id) ON DELETE SET NULL,
  servico TEXT NOT NULL CHECK (servico IN ('Inclusão', 'Substituição', 'Remoção')),
  
  -- Dados da planilha
  km NUMERIC,
  latitude NUMERIC,
  longitude NUMERIC,
  codigo TEXT,
  modelo TEXT,
  tipo TEXT,
  velocidade TEXT,
  descricao TEXT,
  lado TEXT,
  dimensoes_mm TEXT,
  substrato TEXT,
  suporte TEXT,
  pelicula TEXT,
  retrorrefletividade NUMERIC,
  altura_m NUMERIC,
  distancia_m NUMERIC,
  area_m2 NUMERIC,
  br TEXT,
  uf TEXT,
  snv TEXT,
  observacao TEXT,
  
  data_importacao TIMESTAMP DEFAULT NOW(),
  arquivo_origem TEXT,
  linha_planilha INTEGER,
  distancia_match_metros NUMERIC,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. NECESSIDADES - PÓRTICOS
CREATE TABLE public.necessidades_porticos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lote_id UUID NOT NULL REFERENCES public.lotes(id),
  rodovia_id UUID NOT NULL REFERENCES public.rodovias(id),
  
  cadastro_id UUID REFERENCES public.ficha_porticos(id) ON DELETE SET NULL,
  servico TEXT NOT NULL CHECK (servico IN ('Inclusão', 'Substituição', 'Remoção')),
  
  -- Dados da planilha
  km NUMERIC,
  latitude NUMERIC,
  longitude NUMERIC,
  tipo TEXT,
  lado TEXT,
  vao_horizontal_m NUMERIC,
  altura_livre_m NUMERIC,
  estado_conservacao TEXT,
  observacao TEXT,
  snv TEXT,
  
  data_importacao TIMESTAMP DEFAULT NOW(),
  arquivo_origem TEXT,
  linha_planilha INTEGER,
  distancia_match_metros NUMERIC,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. NECESSIDADES - DEFENSAS
CREATE TABLE public.necessidades_defensas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lote_id UUID NOT NULL REFERENCES public.lotes(id),
  rodovia_id UUID NOT NULL REFERENCES public.rodovias(id),
  
  cadastro_id UUID REFERENCES public.defensas(id) ON DELETE SET NULL,
  servico TEXT NOT NULL CHECK (servico IN ('Inclusão', 'Substituição', 'Remoção')),
  
  -- Dados da planilha
  km_inicial NUMERIC,
  km_final NUMERIC,
  latitude_inicial NUMERIC,
  longitude_inicial NUMERIC,
  latitude_final NUMERIC,
  longitude_final NUMERIC,
  lado TEXT,
  tipo_defensa TEXT,
  extensao_metros NUMERIC,
  quantidade_laminas INTEGER,
  terminal_entrada TEXT,
  terminal_saida TEXT,
  nivel_contencao_nchrp350 TEXT,
  nivel_contencao_en1317 TEXT,
  estado_conservacao TEXT,
  tipo_avaria TEXT,
  nivel_risco TEXT,
  observacao TEXT,
  br TEXT,
  snv TEXT,
  
  data_importacao TIMESTAMP DEFAULT NOW(),
  arquivo_origem TEXT,
  linha_planilha INTEGER,
  distancia_match_metros NUMERIC,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Marcas Longitudinais
CREATE INDEX idx_nec_ml_rodovia ON public.necessidades_marcas_longitudinais(rodovia_id);
CREATE INDEX idx_nec_ml_cadastro ON public.necessidades_marcas_longitudinais(cadastro_id);
CREATE INDEX idx_nec_ml_servico ON public.necessidades_marcas_longitudinais(servico);
CREATE INDEX idx_nec_ml_user ON public.necessidades_marcas_longitudinais(user_id);

-- Tachas
CREATE INDEX idx_nec_tachas_rodovia ON public.necessidades_tachas(rodovia_id);
CREATE INDEX idx_nec_tachas_cadastro ON public.necessidades_tachas(cadastro_id);
CREATE INDEX idx_nec_tachas_servico ON public.necessidades_tachas(servico);
CREATE INDEX idx_nec_tachas_user ON public.necessidades_tachas(user_id);

-- Marcas Transversais
CREATE INDEX idx_nec_mt_rodovia ON public.necessidades_marcas_transversais(rodovia_id);
CREATE INDEX idx_nec_mt_cadastro ON public.necessidades_marcas_transversais(cadastro_id);
CREATE INDEX idx_nec_mt_servico ON public.necessidades_marcas_transversais(servico);
CREATE INDEX idx_nec_mt_user ON public.necessidades_marcas_transversais(user_id);

-- Cilindros
CREATE INDEX idx_nec_cil_rodovia ON public.necessidades_cilindros(rodovia_id);
CREATE INDEX idx_nec_cil_cadastro ON public.necessidades_cilindros(cadastro_id);
CREATE INDEX idx_nec_cil_servico ON public.necessidades_cilindros(servico);
CREATE INDEX idx_nec_cil_user ON public.necessidades_cilindros(user_id);

-- Placas
CREATE INDEX idx_nec_placas_rodovia ON public.necessidades_placas(rodovia_id);
CREATE INDEX idx_nec_placas_cadastro ON public.necessidades_placas(cadastro_id);
CREATE INDEX idx_nec_placas_servico ON public.necessidades_placas(servico);
CREATE INDEX idx_nec_placas_user ON public.necessidades_placas(user_id);

-- Pórticos
CREATE INDEX idx_nec_porticos_rodovia ON public.necessidades_porticos(rodovia_id);
CREATE INDEX idx_nec_porticos_cadastro ON public.necessidades_porticos(cadastro_id);
CREATE INDEX idx_nec_porticos_servico ON public.necessidades_porticos(servico);
CREATE INDEX idx_nec_porticos_user ON public.necessidades_porticos(user_id);

-- Defensas
CREATE INDEX idx_nec_def_rodovia ON public.necessidades_defensas(rodovia_id);
CREATE INDEX idx_nec_def_cadastro ON public.necessidades_defensas(cadastro_id);
CREATE INDEX idx_nec_def_servico ON public.necessidades_defensas(servico);
CREATE INDEX idx_nec_def_user ON public.necessidades_defensas(user_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- 1. MARCAS LONGITUDINAIS
ALTER TABLE public.necessidades_marcas_longitudinais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own necessidades ml"
  ON public.necessidades_marcas_longitudinais FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own necessidades ml"
  ON public.necessidades_marcas_longitudinais FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own necessidades ml"
  ON public.necessidades_marcas_longitudinais FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own necessidades ml"
  ON public.necessidades_marcas_longitudinais FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores view all necessidades ml"
  ON public.necessidades_marcas_longitudinais FOR SELECT
  USING (has_role(auth.uid(), 'coordenador') OR has_role(auth.uid(), 'admin'));

-- 2. TACHAS
ALTER TABLE public.necessidades_tachas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own necessidades tachas"
  ON public.necessidades_tachas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own necessidades tachas"
  ON public.necessidades_tachas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own necessidades tachas"
  ON public.necessidades_tachas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own necessidades tachas"
  ON public.necessidades_tachas FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores view all necessidades tachas"
  ON public.necessidades_tachas FOR SELECT
  USING (has_role(auth.uid(), 'coordenador') OR has_role(auth.uid(), 'admin'));

-- 3. MARCAS TRANSVERSAIS
ALTER TABLE public.necessidades_marcas_transversais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own necessidades mt"
  ON public.necessidades_marcas_transversais FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own necessidades mt"
  ON public.necessidades_marcas_transversais FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own necessidades mt"
  ON public.necessidades_marcas_transversais FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own necessidades mt"
  ON public.necessidades_marcas_transversais FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores view all necessidades mt"
  ON public.necessidades_marcas_transversais FOR SELECT
  USING (has_role(auth.uid(), 'coordenador') OR has_role(auth.uid(), 'admin'));

-- 4. CILINDROS
ALTER TABLE public.necessidades_cilindros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own necessidades cil"
  ON public.necessidades_cilindros FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own necessidades cil"
  ON public.necessidades_cilindros FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own necessidades cil"
  ON public.necessidades_cilindros FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own necessidades cil"
  ON public.necessidades_cilindros FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores view all necessidades cil"
  ON public.necessidades_cilindros FOR SELECT
  USING (has_role(auth.uid(), 'coordenador') OR has_role(auth.uid(), 'admin'));

-- 5. PLACAS
ALTER TABLE public.necessidades_placas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own necessidades placas"
  ON public.necessidades_placas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own necessidades placas"
  ON public.necessidades_placas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own necessidades placas"
  ON public.necessidades_placas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own necessidades placas"
  ON public.necessidades_placas FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores view all necessidades placas"
  ON public.necessidades_placas FOR SELECT
  USING (has_role(auth.uid(), 'coordenador') OR has_role(auth.uid(), 'admin'));

-- 6. PÓRTICOS
ALTER TABLE public.necessidades_porticos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own necessidades porticos"
  ON public.necessidades_porticos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own necessidades porticos"
  ON public.necessidades_porticos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own necessidades porticos"
  ON public.necessidades_porticos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own necessidades porticos"
  ON public.necessidades_porticos FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores view all necessidades porticos"
  ON public.necessidades_porticos FOR SELECT
  USING (has_role(auth.uid(), 'coordenador') OR has_role(auth.uid(), 'admin'));

-- 7. DEFENSAS
ALTER TABLE public.necessidades_defensas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own necessidades def"
  ON public.necessidades_defensas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own necessidades def"
  ON public.necessidades_defensas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own necessidades def"
  ON public.necessidades_defensas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own necessidades def"
  ON public.necessidades_defensas FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores view all necessidades def"
  ON public.necessidades_defensas FOR SELECT
  USING (has_role(auth.uid(), 'coordenador') OR has_role(auth.uid(), 'admin'));

-- ============================================
-- TRIGGER PARA UPDATE_AT
-- ============================================

CREATE TRIGGER update_necessidades_ml_updated_at
  BEFORE UPDATE ON public.necessidades_marcas_longitudinais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_necessidades_tachas_updated_at
  BEFORE UPDATE ON public.necessidades_tachas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_necessidades_mt_updated_at
  BEFORE UPDATE ON public.necessidades_marcas_transversais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_necessidades_cil_updated_at
  BEFORE UPDATE ON public.necessidades_cilindros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_necessidades_placas_updated_at
  BEFORE UPDATE ON public.necessidades_placas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_necessidades_porticos_updated_at
  BEFORE UPDATE ON public.necessidades_porticos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_necessidades_def_updated_at
  BEFORE UPDATE ON public.necessidades_defensas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();