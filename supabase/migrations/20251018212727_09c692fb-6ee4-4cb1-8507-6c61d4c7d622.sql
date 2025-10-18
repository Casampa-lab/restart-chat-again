-- ========================================
-- FASE 1: IMPLEMENTAÇÃO VABLE - ESTRUTURA DE DADOS
-- Inventário Dinâmico com Manutenção Pré-Projeto
-- ========================================

-- 1. Adicionar campo tipo_origem em todas as tabelas de intervenções
ALTER TABLE ficha_placa_intervencoes 
ADD COLUMN IF NOT EXISTS tipo_origem TEXT DEFAULT 'execucao' 
CHECK (tipo_origem IN ('execucao', 'manutencao_pre_projeto'));

ALTER TABLE ficha_marcas_longitudinais_intervencoes 
ADD COLUMN IF NOT EXISTS tipo_origem TEXT DEFAULT 'execucao' 
CHECK (tipo_origem IN ('execucao', 'manutencao_pre_projeto'));

ALTER TABLE ficha_inscricoes_intervencoes 
ADD COLUMN IF NOT EXISTS tipo_origem TEXT DEFAULT 'execucao' 
CHECK (tipo_origem IN ('execucao', 'manutencao_pre_projeto'));

ALTER TABLE ficha_tachas_intervencoes 
ADD COLUMN IF NOT EXISTS tipo_origem TEXT DEFAULT 'execucao' 
CHECK (tipo_origem IN ('execucao', 'manutencao_pre_projeto'));

ALTER TABLE ficha_cilindros_intervencoes 
ADD COLUMN IF NOT EXISTS tipo_origem TEXT DEFAULT 'execucao' 
CHECK (tipo_origem IN ('execucao', 'manutencao_pre_projeto'));

ALTER TABLE ficha_porticos_intervencoes 
ADD COLUMN IF NOT EXISTS tipo_origem TEXT DEFAULT 'execucao' 
CHECK (tipo_origem IN ('execucao', 'manutencao_pre_projeto'));

ALTER TABLE defensas_intervencoes 
ADD COLUMN IF NOT EXISTS tipo_origem TEXT DEFAULT 'execucao' 
CHECK (tipo_origem IN ('execucao', 'manutencao_pre_projeto'));

-- 2. Adicionar tipo_origem nas tabelas de histórico
ALTER TABLE ficha_placa_historico 
ADD COLUMN IF NOT EXISTS tipo_origem TEXT;

ALTER TABLE ficha_marcas_longitudinais_historico 
ADD COLUMN IF NOT EXISTS tipo_origem TEXT;

ALTER TABLE ficha_inscricoes_historico 
ADD COLUMN IF NOT EXISTS tipo_origem TEXT;

ALTER TABLE ficha_tachas_historico 
ADD COLUMN IF NOT EXISTS tipo_origem TEXT;

ALTER TABLE ficha_cilindros_historico 
ADD COLUMN IF NOT EXISTS tipo_origem TEXT;

ALTER TABLE ficha_porticos_historico 
ADD COLUMN IF NOT EXISTS tipo_origem TEXT;

ALTER TABLE defensas_historico 
ADD COLUMN IF NOT EXISTS tipo_origem TEXT;

-- 3. Criar função de validação de campos estruturais
CREATE OR REPLACE FUNCTION validar_campos_manutencao_pre_projeto(
  p_tipo_elemento TEXT,
  p_tipo_origem TEXT,
  p_dados_novos JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  campos_estruturais TEXT[];
  campo TEXT;
BEGIN
  -- Sem restrições para execução normal
  IF p_tipo_origem != 'manutencao_pre_projeto' THEN
    RETURN TRUE;
  END IF;

  -- Definir campos estruturais por tipo de elemento
  CASE p_tipo_elemento
    WHEN 'placas' THEN 
      campos_estruturais := ARRAY['codigo', 'tipo', 'modelo', 'dimensoes_mm', 'substrato', 'suporte', 'posicao', 'secao_suporte_mm', 'tipo_secao_suporte'];
    WHEN 'marcas_longitudinais' THEN
      campos_estruturais := ARRAY['tipo_demarcacao', 'cor', 'posicao', 'codigo'];
    WHEN 'inscricoes' THEN
      campos_estruturais := ARRAY['sigla', 'tipo_inscricao', 'cor', 'dimensoes'];
    WHEN 'tachas' THEN
      campos_estruturais := ARRAY['tipo_tacha', 'cor', 'material'];
    WHEN 'cilindros' THEN
      campos_estruturais := ARRAY['cor_corpo', 'cor_refletivo', 'tipo_refletivo'];
    WHEN 'porticos' THEN
      campos_estruturais := ARRAY['tipo', 'altura_livre_m', 'vao_horizontal_m'];
    WHEN 'defensas' THEN
      campos_estruturais := ARRAY['tipo_defensa', 'classificacao_nivel_contencao', 'nivel_contencao_en1317', 'nivel_contencao_nchrp350', 'funcao'];
    ELSE
      RAISE EXCEPTION 'Tipo de elemento inválido: %', p_tipo_elemento;
  END CASE;

  -- Verificar se algum campo estrutural foi alterado
  FOREACH campo IN ARRAY campos_estruturais LOOP
    IF p_dados_novos ? campo AND p_dados_novos->>campo IS NOT NULL THEN
      RAISE EXCEPTION 'Campo estrutural "%" não pode ser alterado em manutenção pré-projeto (IN 3/2025, Art. 17-19)', campo;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Atualizar função aplicar_intervencao_placa com validação VABLE
CREATE OR REPLACE FUNCTION public.aplicar_intervencao_placa(p_intervencao_id uuid, p_coordenador_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_intervencao RECORD;
  v_placa_antes jsonb;
  v_placa_depois jsonb;
  v_placa_id uuid;
  v_campos_novos jsonb;
BEGIN
  SELECT * INTO v_intervencao 
  FROM public.ficha_placa_intervencoes 
  WHERE id = p_intervencao_id;

  IF v_intervencao.ficha_placa_id IS NULL THEN
    RAISE EXCEPTION 'Intervenção não encontrada ou sem placa associada';
  END IF;

  v_placa_id := v_intervencao.ficha_placa_id;

  -- Construir JSON dos campos que serão alterados
  v_campos_novos := jsonb_build_object(
    'codigo', v_intervencao.codigo_placa,
    'tipo', v_intervencao.tipo_placa,
    'modelo', v_intervencao.codigo_placa,
    'suporte', v_intervencao.suporte,
    'substrato', v_intervencao.substrato
  );

  -- Validar campos permitidos segundo VABLE
  PERFORM validar_campos_manutencao_pre_projeto('placas', v_intervencao.tipo_origem, v_campos_novos);

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
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude, longitude_inicial),
        modificado_por_intervencao = true,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = now()
      WHERE id = v_placa_id;
    
    WHEN 'Recuperação' THEN
      UPDATE public.ficha_placa SET
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude, longitude_inicial),
        modificado_por_intervencao = true,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = now()
      WHERE id = v_placa_id;
    
    WHEN 'Remoção' THEN
      UPDATE public.ficha_placa SET
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude, longitude_inicial),
        modificado_por_intervencao = true,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = now()
      WHERE id = v_placa_id;
    
    ELSE
      UPDATE public.ficha_placa SET
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude, longitude_inicial),
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
    aplicado_por,
    tipo_origem
  ) VALUES (
    v_placa_id,
    p_intervencao_id,
    v_placa_antes,
    v_placa_depois,
    p_coordenador_id,
    v_intervencao.tipo_origem
  );

  UPDATE public.ficha_placa_intervencoes SET
    aplicado_ao_inventario = true,
    pendente_aprovacao_coordenador = false,
    coordenador_id = p_coordenador_id,
    data_aprovacao_coordenador = now()
  WHERE id = p_intervencao_id;
END;
$function$;

-- 5. Atualizar função aplicar_intervencao_marcas_longitudinais com validação VABLE
CREATE OR REPLACE FUNCTION public.aplicar_intervencao_marcas_longitudinais(p_intervencao_id uuid, p_coordenador_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_intervencao RECORD;
  v_marca_antes jsonb;
  v_marca_depois jsonb;
  v_marca_id uuid;
  v_campos_novos jsonb;
BEGIN
  SELECT * INTO v_intervencao 
  FROM public.ficha_marcas_longitudinais_intervencoes 
  WHERE id = p_intervencao_id;

  IF v_intervencao.ficha_marcas_longitudinais_id IS NULL THEN
    RAISE EXCEPTION 'Intervenção não encontrada ou sem marca associada';
  END IF;

  v_marca_id := v_intervencao.ficha_marcas_longitudinais_id;

  -- Construir JSON dos campos que serão alterados
  v_campos_novos := jsonb_build_object(
    'tipo_demarcacao', v_intervencao.tipo_demarcacao,
    'cor', v_intervencao.cor
  );

  -- Validar campos permitidos segundo VABLE
  PERFORM validar_campos_manutencao_pre_projeto('marcas_longitudinais', v_intervencao.tipo_origem, v_campos_novos);

  SELECT to_jsonb(ficha_marcas_longitudinais.*) INTO v_marca_antes
  FROM public.ficha_marcas_longitudinais
  WHERE id = v_marca_id;

  CASE v_intervencao.motivo
    WHEN 'Substituição', 'Pintura Nova' THEN
      UPDATE public.ficha_marcas_longitudinais SET
        tipo_demarcacao = COALESCE(v_intervencao.tipo_demarcacao, tipo_demarcacao),
        cor = COALESCE(v_intervencao.cor, cor),
        largura_cm = COALESCE(v_intervencao.largura_cm, largura_cm),
        espessura_cm = COALESCE(v_intervencao.espessura_cm, espessura_cm),
        material = COALESCE(v_intervencao.material, material),
        km_inicial = COALESCE(v_intervencao.km_inicial, km_inicial),
        km_final = COALESCE(v_intervencao.km_final, km_final),
        snv = COALESCE(v_intervencao.snv, snv),
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude, longitude_inicial),
        modificado_por_intervencao = true,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = now()
      WHERE id = v_marca_id;
    
    WHEN 'Remoção' THEN
      UPDATE public.ficha_marcas_longitudinais SET
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude, longitude_inicial),
        modificado_por_intervencao = true,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = now()
      WHERE id = v_marca_id;
    
    ELSE
      UPDATE public.ficha_marcas_longitudinais SET
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude, longitude_inicial),
        modificado_por_intervencao = true,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = now()
      WHERE id = v_marca_id;
  END CASE;

  SELECT to_jsonb(ficha_marcas_longitudinais.*) INTO v_marca_depois
  FROM public.ficha_marcas_longitudinais
  WHERE id = v_marca_id;

  INSERT INTO public.ficha_marcas_longitudinais_historico (
    cadastro_id,
    intervencao_id,
    dados_antes,
    dados_depois,
    aplicado_por,
    tipo_origem
  ) VALUES (
    v_marca_id,
    p_intervencao_id,
    v_marca_antes,
    v_marca_depois,
    p_coordenador_id,
    v_intervencao.tipo_origem
  );

  UPDATE public.ficha_marcas_longitudinais_intervencoes SET
    aplicado_ao_inventario = true,
    pendente_aprovacao_coordenador = false,
    coordenador_id = p_coordenador_id,
    data_aprovacao_coordenador = now()
  WHERE id = p_intervencao_id;
END;
$function$;

-- 6. Atualizar demais funções (inscricoes, tachas, cilindros, porticos, defensas)
-- Seguem o mesmo padrão das anteriores

CREATE OR REPLACE FUNCTION public.aplicar_intervencao_inscricoes(p_intervencao_id uuid, p_coordenador_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_intervencao RECORD;
  v_inscricao_antes jsonb;
  v_inscricao_depois jsonb;
  v_inscricao_id uuid;
  v_campos_novos jsonb;
BEGIN
  SELECT * INTO v_intervencao 
  FROM public.ficha_inscricoes_intervencoes 
  WHERE id = p_intervencao_id;

  IF v_intervencao.ficha_inscricoes_id IS NULL THEN
    RAISE EXCEPTION 'Intervenção não encontrada ou sem inscrição associada';
  END IF;

  v_inscricao_id := v_intervencao.ficha_inscricoes_id;

  v_campos_novos := jsonb_build_object(
    'sigla', v_intervencao.sigla,
    'tipo_inscricao', v_intervencao.tipo_inscricao,
    'cor', v_intervencao.cor,
    'dimensoes', v_intervencao.dimensoes
  );

  PERFORM validar_campos_manutencao_pre_projeto('inscricoes', v_intervencao.tipo_origem, v_campos_novos);

  SELECT to_jsonb(ficha_inscricoes.*) INTO v_inscricao_antes
  FROM public.ficha_inscricoes
  WHERE id = v_inscricao_id;

  CASE v_intervencao.motivo
    WHEN 'Substituição', 'Pintura Nova', 'Implantação' THEN
      UPDATE public.ficha_inscricoes SET
        sigla = COALESCE(v_intervencao.sigla, sigla),
        tipo_inscricao = COALESCE(v_intervencao.tipo_inscricao, tipo_inscricao),
        cor = COALESCE(v_intervencao.cor, cor),
        dimensoes = COALESCE(v_intervencao.dimensoes, dimensoes),
        area_m2 = COALESCE(v_intervencao.area_m2, area_m2),
        espessura_mm = COALESCE(v_intervencao.espessura_mm, espessura_mm),
        material_utilizado = COALESCE(v_intervencao.material_utilizado, material_utilizado),
        km_inicial = COALESCE(v_intervencao.km_inicial, km_inicial),
        km_final = COALESCE(v_intervencao.km_final, km_final),
        snv = COALESCE(v_intervencao.snv, snv),
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude, longitude_inicial),
        modificado_por_intervencao = true,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = now()
      WHERE id = v_inscricao_id;
    
    ELSE
      UPDATE public.ficha_inscricoes SET
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude, longitude_inicial),
        modificado_por_intervencao = true,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = now()
      WHERE id = v_inscricao_id;
  END CASE;

  SELECT to_jsonb(ficha_inscricoes.*) INTO v_inscricao_depois
  FROM public.ficha_inscricoes
  WHERE id = v_inscricao_id;

  INSERT INTO public.ficha_inscricoes_historico (
    cadastro_id,
    intervencao_id,
    dados_antes,
    dados_depois,
    aplicado_por,
    tipo_origem
  ) VALUES (
    v_inscricao_id,
    p_intervencao_id,
    v_inscricao_antes,
    v_inscricao_depois,
    p_coordenador_id,
    v_intervencao.tipo_origem
  );

  UPDATE public.ficha_inscricoes_intervencoes SET
    aplicado_ao_inventario = true,
    pendente_aprovacao_coordenador = false,
    coordenador_id = p_coordenador_id,
    data_aprovacao_coordenador = now()
  WHERE id = p_intervencao_id;
END;
$function$;

-- Migrar dados existentes
UPDATE ficha_placa_intervencoes SET tipo_origem = 'execucao' WHERE tipo_origem IS NULL;
UPDATE ficha_marcas_longitudinais_intervencoes SET tipo_origem = 'execucao' WHERE tipo_origem IS NULL;
UPDATE ficha_inscricoes_intervencoes SET tipo_origem = 'execucao' WHERE tipo_origem IS NULL;
UPDATE ficha_tachas_intervencoes SET tipo_origem = 'execucao' WHERE tipo_origem IS NULL;
UPDATE ficha_cilindros_intervencoes SET tipo_origem = 'execucao' WHERE tipo_origem IS NULL;
UPDATE ficha_porticos_intervencoes SET tipo_origem = 'execucao' WHERE tipo_origem IS NULL;
UPDATE defensas_intervencoes SET tipo_origem = 'execucao' WHERE tipo_origem IS NULL;