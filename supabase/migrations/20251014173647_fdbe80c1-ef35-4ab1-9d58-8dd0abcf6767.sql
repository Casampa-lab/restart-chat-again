-- ============================================
-- FASE 1: Sistema de Inventário Dinâmico
-- Tabelas de Histórico + Colunas de Controle + Funções
-- ============================================

-- 1.1. CRIAR TABELAS DE HISTÓRICO
CREATE TABLE IF NOT EXISTS public.ficha_placa_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_id uuid NOT NULL REFERENCES public.ficha_placa(id) ON DELETE CASCADE,
  intervencao_id uuid NOT NULL REFERENCES public.ficha_placa_intervencoes(id) ON DELETE CASCADE,
  dados_antes jsonb NOT NULL,
  dados_depois jsonb NOT NULL,
  aplicado_por uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ficha_porticos_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_id uuid NOT NULL REFERENCES public.ficha_porticos(id) ON DELETE CASCADE,
  intervencao_id uuid NOT NULL REFERENCES public.ficha_porticos_intervencoes(id) ON DELETE CASCADE,
  dados_antes jsonb NOT NULL,
  dados_depois jsonb NOT NULL,
  aplicado_por uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.defensas_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_id uuid NOT NULL REFERENCES public.defensas(id) ON DELETE CASCADE,
  intervencao_id uuid NOT NULL REFERENCES public.defensas_intervencoes(id) ON DELETE CASCADE,
  dados_antes jsonb NOT NULL,
  dados_depois jsonb NOT NULL,
  aplicado_por uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ficha_cilindros_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_id uuid NOT NULL REFERENCES public.ficha_cilindros(id) ON DELETE CASCADE,
  intervencao_id uuid NOT NULL REFERENCES public.ficha_cilindros_intervencoes(id) ON DELETE CASCADE,
  dados_antes jsonb NOT NULL,
  dados_depois jsonb NOT NULL,
  aplicado_por uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ficha_tachas_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_id uuid NOT NULL REFERENCES public.ficha_tachas(id) ON DELETE CASCADE,
  intervencao_id uuid NOT NULL REFERENCES public.ficha_tachas_intervencoes(id) ON DELETE CASCADE,
  dados_antes jsonb NOT NULL,
  dados_depois jsonb NOT NULL,
  aplicado_por uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ficha_inscricoes_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_id uuid NOT NULL REFERENCES public.ficha_inscricoes(id) ON DELETE CASCADE,
  intervencao_id uuid NOT NULL REFERENCES public.ficha_inscricoes_intervencoes(id) ON DELETE CASCADE,
  dados_antes jsonb NOT NULL,
  dados_depois jsonb NOT NULL,
  aplicado_por uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ficha_marcas_longitudinais_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_id uuid NOT NULL REFERENCES public.ficha_marcas_longitudinais(id) ON DELETE CASCADE,
  intervencao_id uuid NOT NULL REFERENCES public.ficha_marcas_longitudinais_intervencoes(id) ON DELETE CASCADE,
  dados_antes jsonb NOT NULL,
  dados_depois jsonb NOT NULL,
  aplicado_por uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 1.2. ADICIONAR COLUNAS DE CONTROLE NO INVENTÁRIO
ALTER TABLE public.ficha_placa 
  ADD COLUMN IF NOT EXISTS ultima_intervencao_id uuid REFERENCES public.ficha_placa_intervencoes(id),
  ADD COLUMN IF NOT EXISTS modificado_por_intervencao boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_ultima_modificacao timestamptz;

ALTER TABLE public.ficha_porticos 
  ADD COLUMN IF NOT EXISTS ultima_intervencao_id uuid REFERENCES public.ficha_porticos_intervencoes(id),
  ADD COLUMN IF NOT EXISTS modificado_por_intervencao boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_ultima_modificacao timestamptz;

ALTER TABLE public.defensas 
  ADD COLUMN IF NOT EXISTS ultima_intervencao_id uuid REFERENCES public.defensas_intervencoes(id),
  ADD COLUMN IF NOT EXISTS modificado_por_intervencao boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_ultima_modificacao timestamptz;

ALTER TABLE public.ficha_cilindros 
  ADD COLUMN IF NOT EXISTS ultima_intervencao_id uuid REFERENCES public.ficha_cilindros_intervencoes(id),
  ADD COLUMN IF NOT EXISTS modificado_por_intervencao boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_ultima_modificacao timestamptz;

ALTER TABLE public.ficha_tachas 
  ADD COLUMN IF NOT EXISTS ultima_intervencao_id uuid REFERENCES public.ficha_tachas_intervencoes(id),
  ADD COLUMN IF NOT EXISTS modificado_por_intervencao boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_ultima_modificacao timestamptz;

ALTER TABLE public.ficha_inscricoes 
  ADD COLUMN IF NOT EXISTS ultima_intervencao_id uuid REFERENCES public.ficha_inscricoes_intervencoes(id),
  ADD COLUMN IF NOT EXISTS modificado_por_intervencao boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_ultima_modificacao timestamptz;

ALTER TABLE public.ficha_marcas_longitudinais 
  ADD COLUMN IF NOT EXISTS ultima_intervencao_id uuid REFERENCES public.ficha_marcas_longitudinais_intervencoes(id),
  ADD COLUMN IF NOT EXISTS modificado_por_intervencao boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_ultima_modificacao timestamptz;

-- 1.3. ADICIONAR COLUNAS DE APROVAÇÃO NAS INTERVENÇÕES
ALTER TABLE public.ficha_placa_intervencoes 
  ADD COLUMN IF NOT EXISTS pendente_aprovacao_coordenador boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS coordenador_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS data_aprovacao_coordenador timestamptz,
  ADD COLUMN IF NOT EXISTS aplicado_ao_inventario boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS observacao_coordenador text;

ALTER TABLE public.ficha_porticos_intervencoes 
  ADD COLUMN IF NOT EXISTS pendente_aprovacao_coordenador boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS coordenador_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS data_aprovacao_coordenador timestamptz,
  ADD COLUMN IF NOT EXISTS aplicado_ao_inventario boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS observacao_coordenador text;

ALTER TABLE public.defensas_intervencoes 
  ADD COLUMN IF NOT EXISTS pendente_aprovacao_coordenador boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS coordenador_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS data_aprovacao_coordenador timestamptz,
  ADD COLUMN IF NOT EXISTS aplicado_ao_inventario boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS observacao_coordenador text;

ALTER TABLE public.ficha_cilindros_intervencoes 
  ADD COLUMN IF NOT EXISTS pendente_aprovacao_coordenador boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS coordenador_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS data_aprovacao_coordenador timestamptz,
  ADD COLUMN IF NOT EXISTS aplicado_ao_inventario boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS observacao_coordenador text;

ALTER TABLE public.ficha_tachas_intervencoes 
  ADD COLUMN IF NOT EXISTS pendente_aprovacao_coordenador boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS coordenador_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS data_aprovacao_coordenador timestamptz,
  ADD COLUMN IF NOT EXISTS aplicado_ao_inventario boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS observacao_coordenador text;

ALTER TABLE public.ficha_inscricoes_intervencoes 
  ADD COLUMN IF NOT EXISTS pendente_aprovacao_coordenador boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS coordenador_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS data_aprovacao_coordenador timestamptz,
  ADD COLUMN IF NOT EXISTS aplicado_ao_inventario boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS observacao_coordenador text;

ALTER TABLE public.ficha_marcas_longitudinais_intervencoes 
  ADD COLUMN IF NOT EXISTS pendente_aprovacao_coordenador boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS coordenador_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS data_aprovacao_coordenador timestamptz,
  ADD COLUMN IF NOT EXISTS aplicado_ao_inventario boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS observacao_coordenador text;

-- 1.4. CRIAR FUNÇÕES PARA APLICAR INTERVENÇÕES

-- Função para PLACAS
CREATE OR REPLACE FUNCTION public.aplicar_intervencao_placa(
  p_intervencao_id uuid,
  p_coordenador_id uuid
) RETURNS void AS $$
DECLARE
  v_intervencao RECORD;
  v_placa_antes jsonb;
  v_placa_depois jsonb;
  v_placa_id uuid;
BEGIN
  SELECT * INTO v_intervencao 
  FROM public.ficha_placa_intervencoes 
  WHERE id = p_intervencao_id;

  IF v_intervencao.ficha_placa_id IS NULL THEN
    RAISE EXCEPTION 'Intervenção não encontrada ou sem placa associada';
  END IF;

  v_placa_id := v_intervencao.ficha_placa_id;

  SELECT to_jsonb(ficha_placa.*) INTO v_placa_antes
  FROM public.ficha_placa
  WHERE id = v_placa_id;

  CASE v_intervencao.motivo
    WHEN 'Substituição' THEN
      UPDATE public.ficha_placa SET
        suporte = COALESCE(v_intervencao.suporte, suporte),
        substrato = COALESCE(v_intervencao.substrato, substrato),
        tipo_pelicula_fundo = COALESCE(v_intervencao.tipo_pelicula_fundo_novo, tipo_pelicula_fundo),
        retro_pelicula_fundo = COALESCE(v_intervencao.retro_fundo, retro_pelicula_fundo),
        retro_pelicula_legenda_orla = COALESCE(v_intervencao.retro_orla_legenda, retro_pelicula_legenda_orla),
        modificado_por_intervencao = true,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = now()
      WHERE id = v_placa_id;
    
    WHEN 'Recuperação' THEN
      UPDATE public.ficha_placa SET
        modificado_por_intervencao = true,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = now()
      WHERE id = v_placa_id;
    
    WHEN 'Remoção' THEN
      UPDATE public.ficha_placa SET
        modificado_por_intervencao = true,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = now()
      WHERE id = v_placa_id;
    
    ELSE
      UPDATE public.ficha_placa SET
        modificado_por_intervencao = true,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = now()
      WHERE id = v_placa_id;
  END CASE;

  SELECT to_jsonb(ficha_placa.*) INTO v_placa_depois
  FROM public.ficha_placa
  WHERE id = v_placa_id;

  INSERT INTO public.ficha_placa_historico (
    cadastro_id,
    intervencao_id,
    dados_antes,
    dados_depois,
    aplicado_por
  ) VALUES (
    v_placa_id,
    p_intervencao_id,
    v_placa_antes,
    v_placa_depois,
    p_coordenador_id
  );

  UPDATE public.ficha_placa_intervencoes SET
    aplicado_ao_inventario = true,
    pendente_aprovacao_coordenador = false,
    coordenador_id = p_coordenador_id,
    data_aprovacao_coordenador = now()
  WHERE id = p_intervencao_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para PÓRTICOS
CREATE OR REPLACE FUNCTION public.aplicar_intervencao_portico(
  p_intervencao_id uuid,
  p_coordenador_id uuid
) RETURNS void AS $$
DECLARE
  v_intervencao RECORD;
  v_portico_antes jsonb;
  v_portico_depois jsonb;
  v_portico_id uuid;
BEGIN
  SELECT * INTO v_intervencao 
  FROM public.ficha_porticos_intervencoes 
  WHERE id = p_intervencao_id;

  IF v_intervencao.ficha_porticos_id IS NULL THEN
    RAISE EXCEPTION 'Intervenção não encontrada ou sem pórtico associado';
  END IF;

  v_portico_id := v_intervencao.ficha_porticos_id;

  SELECT to_jsonb(ficha_porticos.*) INTO v_portico_antes
  FROM public.ficha_porticos
  WHERE id = v_portico_id;

  CASE v_intervencao.motivo
    WHEN 'Substituição' THEN
      UPDATE public.ficha_porticos SET
        tipo = COALESCE(v_intervencao.tipo, tipo),
        vao_horizontal_m = COALESCE(v_intervencao.vao_horizontal_m, vao_horizontal_m),
        altura_livre_m = COALESCE(v_intervencao.altura_livre_m, altura_livre_m),
        modificado_por_intervencao = true,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = now()
      WHERE id = v_portico_id;
    
    ELSE
      UPDATE public.ficha_porticos SET
        modificado_por_intervencao = true,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = now()
      WHERE id = v_portico_id;
  END CASE;

  SELECT to_jsonb(ficha_porticos.*) INTO v_portico_depois
  FROM public.ficha_porticos
  WHERE id = v_portico_id;

  INSERT INTO public.ficha_porticos_historico (
    cadastro_id,
    intervencao_id,
    dados_antes,
    dados_depois,
    aplicado_por
  ) VALUES (
    v_portico_id,
    p_intervencao_id,
    v_portico_antes,
    v_portico_depois,
    p_coordenador_id
  );

  UPDATE public.ficha_porticos_intervencoes SET
    aplicado_ao_inventario = true,
    pendente_aprovacao_coordenador = false,
    coordenador_id = p_coordenador_id,
    data_aprovacao_coordenador = now()
  WHERE id = p_intervencao_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 1.5. POLÍTICAS RLS PARA HISTÓRICO

ALTER TABLE public.ficha_placa_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ficha_porticos_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defensas_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ficha_cilindros_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ficha_tachas_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ficha_inscricoes_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ficha_marcas_longitudinais_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordenadores veem histórico placas"
ON public.ficha_placa_historico FOR SELECT
USING (
  has_role(auth.uid(), 'coordenador') OR
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Coordenadores veem histórico porticos"
ON public.ficha_porticos_historico FOR SELECT
USING (
  has_role(auth.uid(), 'coordenador') OR
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Coordenadores veem histórico defensas"
ON public.defensas_historico FOR SELECT
USING (
  has_role(auth.uid(), 'coordenador') OR
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Coordenadores veem histórico cilindros"
ON public.ficha_cilindros_historico FOR SELECT
USING (
  has_role(auth.uid(), 'coordenador') OR
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Coordenadores veem histórico tachas"
ON public.ficha_tachas_historico FOR SELECT
USING (
  has_role(auth.uid(), 'coordenador') OR
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Coordenadores veem histórico inscricoes"
ON public.ficha_inscricoes_historico FOR SELECT
USING (
  has_role(auth.uid(), 'coordenador') OR
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Coordenadores veem histórico marcas"
ON public.ficha_marcas_longitudinais_historico FOR SELECT
USING (
  has_role(auth.uid(), 'coordenador') OR
  has_role(auth.uid(), 'admin')
);