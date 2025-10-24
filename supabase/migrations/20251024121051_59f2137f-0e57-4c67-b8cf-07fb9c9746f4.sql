-- =====================================================
-- FASE 1: Renomear manutencao_pre_projeto → manutencao_rotineira
-- =====================================================

-- 1. ATUALIZAR DADOS EXISTENTES
-- 1.1 Tabelas de Intervenções
UPDATE ficha_placa_intervencoes 
SET tipo_origem = 'manutencao_rotineira' 
WHERE tipo_origem = 'manutencao_pre_projeto';

UPDATE ficha_marcas_longitudinais_intervencoes 
SET tipo_origem = 'manutencao_rotineira' 
WHERE tipo_origem = 'manutencao_pre_projeto';

UPDATE ficha_inscricoes_intervencoes 
SET tipo_origem = 'manutencao_rotineira' 
WHERE tipo_origem = 'manutencao_pre_projeto';

UPDATE ficha_tachas_intervencoes 
SET tipo_origem = 'manutencao_rotineira' 
WHERE tipo_origem = 'manutencao_pre_projeto';

UPDATE ficha_cilindros_intervencoes 
SET tipo_origem = 'manutencao_rotineira' 
WHERE tipo_origem = 'manutencao_pre_projeto';

UPDATE ficha_porticos_intervencoes 
SET tipo_origem = 'manutencao_rotineira' 
WHERE tipo_origem = 'manutencao_pre_projeto';

UPDATE defensas_intervencoes 
SET tipo_origem = 'manutencao_rotineira' 
WHERE tipo_origem = 'manutencao_pre_projeto';

-- 1.2 Tabelas de Inventário (coluna origem)
UPDATE ficha_placa 
SET origem = 'manutencao_rotineira' 
WHERE origem = 'manutencao_pre_projeto';

UPDATE ficha_marcas_longitudinais 
SET origem = 'manutencao_rotineira' 
WHERE origem = 'manutencao_pre_projeto';

UPDATE ficha_inscricoes 
SET origem = 'manutencao_rotineira' 
WHERE origem = 'manutencao_pre_projeto';

UPDATE ficha_tachas 
SET origem = 'manutencao_rotineira' 
WHERE origem = 'manutencao_pre_projeto';

UPDATE ficha_cilindros 
SET origem = 'manutencao_rotineira' 
WHERE origem = 'manutencao_pre_projeto';

UPDATE ficha_porticos 
SET origem = 'manutencao_rotineira' 
WHERE origem = 'manutencao_pre_projeto';

UPDATE defensas 
SET origem = 'manutencao_rotineira' 
WHERE origem = 'manutencao_pre_projeto';

-- 2. DROPAR CONSTRAINTS ANTIGOS
ALTER TABLE ficha_placa_intervencoes DROP CONSTRAINT IF EXISTS ficha_placa_intervencoes_tipo_origem_check;
ALTER TABLE ficha_marcas_longitudinais_intervencoes DROP CONSTRAINT IF EXISTS ficha_marcas_longitudinais_intervencoes_tipo_origem_check;
ALTER TABLE ficha_inscricoes_intervencoes DROP CONSTRAINT IF EXISTS ficha_inscricoes_intervencoes_tipo_origem_check;
ALTER TABLE ficha_tachas_intervencoes DROP CONSTRAINT IF EXISTS ficha_tachas_intervencoes_tipo_origem_check;
ALTER TABLE ficha_cilindros_intervencoes DROP CONSTRAINT IF EXISTS ficha_cilindros_intervencoes_tipo_origem_check;
ALTER TABLE ficha_porticos_intervencoes DROP CONSTRAINT IF EXISTS ficha_porticos_intervencoes_tipo_origem_check;
ALTER TABLE defensas_intervencoes DROP CONSTRAINT IF EXISTS defensas_intervencoes_tipo_origem_check;

-- 3. CRIAR CONSTRAINTS NOVOS
ALTER TABLE ficha_placa_intervencoes 
ADD CONSTRAINT ficha_placa_intervencoes_tipo_origem_check 
CHECK (tipo_origem IN ('execucao', 'manutencao_rotineira'));

ALTER TABLE ficha_marcas_longitudinais_intervencoes 
ADD CONSTRAINT ficha_marcas_longitudinais_intervencoes_tipo_origem_check 
CHECK (tipo_origem IN ('execucao', 'manutencao_rotineira'));

ALTER TABLE ficha_inscricoes_intervencoes 
ADD CONSTRAINT ficha_inscricoes_intervencoes_tipo_origem_check 
CHECK (tipo_origem IN ('execucao', 'manutencao_rotineira'));

ALTER TABLE ficha_tachas_intervencoes 
ADD CONSTRAINT ficha_tachas_intervencoes_tipo_origem_check 
CHECK (tipo_origem IN ('execucao', 'manutencao_rotineira'));

ALTER TABLE ficha_cilindros_intervencoes 
ADD CONSTRAINT ficha_cilindros_intervencoes_tipo_origem_check 
CHECK (tipo_origem IN ('execucao', 'manutencao_rotineira'));

ALTER TABLE ficha_porticos_intervencoes 
ADD CONSTRAINT ficha_porticos_intervencoes_tipo_origem_check 
CHECK (tipo_origem IN ('execucao', 'manutencao_rotineira'));

ALTER TABLE defensas_intervencoes 
ADD CONSTRAINT defensas_intervencoes_tipo_origem_check 
CHECK (tipo_origem IN ('execucao', 'manutencao_rotineira'));

-- 4. RENOMEAR FUNÇÃO DE VALIDAÇÃO
DROP FUNCTION IF EXISTS validar_campos_manutencao_rotineira(TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION validar_campos_manutencao_rotineira(
  p_tipo_elemento TEXT, 
  p_tipo_origem TEXT, 
  p_dados_novos JSONB
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  campos_estruturais TEXT[];
  campo TEXT;
BEGIN
  -- Sem restrições para execução normal
  IF p_tipo_origem != 'manutencao_rotineira' THEN
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
      RAISE EXCEPTION 'Campo estrutural "%" não pode ser alterado em manutenção rotineira (IN 3/2025, Art. 17-19)', campo;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$;

-- 5. ATUALIZAR FUNÇÕES QUE CHAMAM A VALIDAÇÃO
-- Placas
CREATE OR REPLACE FUNCTION aplicar_intervencao_placa(p_intervencao_id UUID, p_coordenador_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_intervencao RECORD;
  v_placa_antes JSONB;
  v_placa_depois JSONB;
  v_placa_id UUID;
  v_campos_novos JSONB;
BEGIN
  SELECT * INTO v_intervencao 
  FROM public.ficha_placa_intervencoes 
  WHERE id = p_intervencao_id;

  IF v_intervencao.ficha_placa_id IS NULL THEN
    RAISE EXCEPTION 'Intervenção não encontrada ou sem placa associada';
  END IF;

  v_placa_id := v_intervencao.ficha_placa_id;

  v_campos_novos := jsonb_build_object(
    'codigo', v_intervencao.codigo_placa,
    'tipo', v_intervencao.tipo_placa,
    'modelo', v_intervencao.codigo_placa,
    'suporte', v_intervencao.suporte,
    'substrato', v_intervencao.substrato
  );

  PERFORM validar_campos_manutencao_rotineira('placas', v_intervencao.tipo_origem, v_campos_novos);

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
        modificado_por_intervencao = TRUE,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = NOW()
      WHERE id = v_placa_id;
    
    WHEN 'Recuperação' THEN
      UPDATE public.ficha_placa SET
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude, longitude_inicial),
        modificado_por_intervencao = TRUE,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = NOW()
      WHERE id = v_placa_id;
    
    WHEN 'Remoção' THEN
      UPDATE public.ficha_placa SET
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude, longitude_inicial),
        modificado_por_intervencao = TRUE,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = NOW()
      WHERE id = v_placa_id;
    
    ELSE
      UPDATE public.ficha_placa SET
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude, longitude_inicial),
        modificado_por_intervencao = TRUE,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = NOW()
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
    aplicado_ao_inventario = TRUE,
    pendente_aprovacao_coordenador = FALSE,
    coordenador_id = p_coordenador_id,
    data_aprovacao_coordenador = NOW()
  WHERE id = p_intervencao_id;
END;
$$;

-- Marcas Longitudinais
CREATE OR REPLACE FUNCTION aplicar_intervencao_marcas_longitudinais(p_intervencao_id UUID, p_coordenador_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_intervencao RECORD;
  v_marca_antes JSONB;
  v_marca_depois JSONB;
  v_marca_id UUID;
  v_campos_novos JSONB;
BEGIN
  SELECT * INTO v_intervencao 
  FROM public.ficha_marcas_longitudinais_intervencoes 
  WHERE id = p_intervencao_id;

  IF v_intervencao.ficha_marcas_longitudinais_id IS NULL THEN
    RAISE EXCEPTION 'Intervenção não encontrada ou sem marca associada';
  END IF;

  v_marca_id := v_intervencao.ficha_marcas_longitudinais_id;

  v_campos_novos := jsonb_build_object(
    'tipo_demarcacao', v_intervencao.tipo_demarcacao,
    'cor', v_intervencao.cor
  );

  PERFORM validar_campos_manutencao_rotineira('marcas_longitudinais', v_intervencao.tipo_origem, v_campos_novos);

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
        latitude_inicial = COALESCE(v_intervencao.latitude_inicial, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude_inicial, longitude_inicial),
        modificado_por_intervencao = TRUE,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = NOW()
      WHERE id = v_marca_id;
    
    WHEN 'Remoção' THEN
      UPDATE public.ficha_marcas_longitudinais SET
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude_inicial, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude_inicial, longitude_inicial),
        modificado_por_intervencao = TRUE,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = NOW()
      WHERE id = v_marca_id;
    
    ELSE
      UPDATE public.ficha_marcas_longitudinais SET
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude_inicial, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude_inicial, longitude_inicial),
        modificado_por_intervencao = TRUE,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = NOW()
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
    aplicado_ao_inventario = TRUE,
    pendente_aprovacao_coordenador = FALSE,
    coordenador_id = p_coordenador_id,
    data_aprovacao_coordenador = NOW()
  WHERE id = p_intervencao_id;
END;
$$;

-- Inscrições
CREATE OR REPLACE FUNCTION aplicar_intervencao_inscricoes(p_intervencao_id UUID, p_coordenador_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_intervencao RECORD;
  v_inscricao_antes JSONB;
  v_inscricao_depois JSONB;
  v_inscricao_id UUID;
  v_campos_novos JSONB;
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

  PERFORM validar_campos_manutencao_rotineira('inscricoes', v_intervencao.tipo_origem, v_campos_novos);

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
        snv = COALESCE(v_intervencao.snv, snv),
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude_inicial, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude_inicial, longitude_inicial),
        modificado_por_intervencao = TRUE,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = NOW()
      WHERE id = v_inscricao_id;
    
    ELSE
      UPDATE public.ficha_inscricoes SET
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude_inicial, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude_inicial, longitude_inicial),
        modificado_por_intervencao = TRUE,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = NOW()
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
    aplicado_ao_inventario = TRUE,
    pendente_aprovacao_coordenador = FALSE,
    coordenador_id = p_coordenador_id,
    data_aprovacao_coordenador = NOW()
  WHERE id = p_intervencao_id;
END;
$$;

-- 6. ATUALIZAR COMENTÁRIOS
COMMENT ON COLUMN ficha_placa.origem IS 'Origem do cadastro: cadastro_inicial, manutencao_rotineira, execucao';
COMMENT ON COLUMN ficha_marcas_longitudinais.origem IS 'Origem do cadastro: cadastro_inicial, manutencao_rotineira, execucao';
COMMENT ON COLUMN ficha_inscricoes.origem IS 'Origem do cadastro: cadastro_inicial, manutencao_rotineira, execucao';
COMMENT ON COLUMN ficha_tachas.origem IS 'Origem do cadastro: cadastro_inicial, manutencao_rotineira, execucao';
COMMENT ON COLUMN ficha_cilindros.origem IS 'Origem do cadastro: cadastro_inicial, manutencao_rotineira, execucao';
COMMENT ON COLUMN ficha_porticos.origem IS 'Origem do cadastro: cadastro_inicial, manutencao_rotineira, execucao';
COMMENT ON COLUMN defensas.origem IS 'Origem do cadastro: cadastro_inicial, manutencao_rotineira, execucao';

-- 7. ATUALIZAR FUNÇÃO DE BADGE
CREATE OR REPLACE FUNCTION get_tipo_origem_badge(p_tipo_origem TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_tipo_origem
    WHEN 'execucao' THEN '🟢 Execução'
    WHEN 'manutencao_rotineira' THEN '🟡 Manutenção Rotineira'
    ELSE '⚪ Cadastro Inicial'
  END;
END;
$$;

-- 8. ATUALIZAR VIEWS DE INVENTÁRIO DINÂMICO
-- v_inventario_dinamico_placas
CREATE OR REPLACE VIEW v_inventario_dinamico_placas AS
SELECT 
  p.id,
  p.codigo,
  p.tipo,
  p.km_inicial,
  p.rodovia_id,
  p.lote_id,
  p.latitude_inicial,
  p.longitude_inicial,
  p.origem,
  p.modificado_por_intervencao,
  CASE 
    WHEN p.modificado_por_intervencao AND p.origem = 'manutencao_rotineira' THEN 'manutencao_rotineira'
    WHEN p.modificado_por_intervencao AND p.origem = 'execucao' THEN 'execucao'
    ELSE 'cadastro_inicial'
  END as tipo_origem
FROM ficha_placa p
WHERE p.ativo = TRUE;

-- v_inventario_dinamico_defensas
CREATE OR REPLACE VIEW v_inventario_dinamico_defensas AS
SELECT 
  d.id,
  d.classificacao_nivel_contencao,
  d.km_inicial,
  d.km_final,
  d.rodovia_id,
  d.lote_id,
  d.latitude_inicial,
  d.longitude_inicial,
  d.origem,
  d.modificado_por_intervencao,
  CASE 
    WHEN d.modificado_por_intervencao AND d.origem = 'manutencao_rotineira' THEN 'manutencao_rotineira'
    WHEN d.modificado_por_intervencao AND d.origem = 'execucao' THEN 'execucao'
    ELSE 'cadastro_inicial'
  END as tipo_origem
FROM defensas d
WHERE d.ativo = TRUE;

-- v_inventario_dinamico_marcas
CREATE OR REPLACE VIEW v_inventario_dinamico_marcas AS
SELECT 
  m.id,
  m.tipo_demarcacao,
  m.cor,
  m.km_inicial,
  m.km_final,
  m.rodovia_id,
  m.lote_id,
  m.latitude_inicial,
  m.longitude_inicial,
  m.origem,
  m.modificado_por_intervencao,
  CASE 
    WHEN m.modificado_por_intervencao AND m.origem = 'manutencao_rotineira' THEN 'manutencao_rotineira'
    WHEN m.modificado_por_intervencao AND m.origem = 'execucao' THEN 'execucao'
    ELSE 'cadastro_inicial'
  END as tipo_origem
FROM ficha_marcas_longitudinais m
WHERE m.ativo = TRUE;

-- v_inventario_dinamico_inscricoes
CREATE OR REPLACE VIEW v_inventario_dinamico_inscricoes AS
SELECT 
  i.id,
  i.sigla,
  i.tipo_inscricao,
  i.km_inicial,
  i.rodovia_id,
  i.lote_id,
  i.latitude_inicial,
  i.longitude_inicial,
  i.origem,
  i.modificado_por_intervencao,
  CASE 
    WHEN i.modificado_por_intervencao AND i.origem = 'manutencao_rotineira' THEN 'manutencao_rotineira'
    WHEN i.modificado_por_intervencao AND i.origem = 'execucao' THEN 'execucao'
    ELSE 'cadastro_inicial'
  END as tipo_origem
FROM ficha_inscricoes i
WHERE i.ativo = TRUE;

-- v_inventario_dinamico_cilindros
CREATE OR REPLACE VIEW v_inventario_dinamico_cilindros AS
SELECT 
  c.id,
  c.cor_corpo,
  c.cor_refletivo,
  c.km_inicial,
  c.km_final,
  c.rodovia_id,
  c.lote_id,
  c.latitude_inicial,
  c.longitude_inicial,
  c.origem,
  c.modificado_por_intervencao,
  CASE 
    WHEN c.modificado_por_intervencao AND c.origem = 'manutencao_rotineira' THEN 'manutencao_rotineira'
    WHEN c.modificado_por_intervencao AND c.origem = 'execucao' THEN 'execucao'
    ELSE 'cadastro_inicial'
  END as tipo_origem
FROM ficha_cilindros c
WHERE c.ativo = TRUE;

-- VERIFICAÇÕES PÓS-MIGRATION
DO $$
DECLARE
  v_count INT;
BEGIN
  -- Verificar se ainda existem valores antigos
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT tipo_origem FROM ficha_placa_intervencoes WHERE tipo_origem = 'manutencao_pre_projeto'
    UNION ALL
    SELECT tipo_origem FROM ficha_marcas_longitudinais_intervencoes WHERE tipo_origem = 'manutencao_pre_projeto'
    UNION ALL
    SELECT tipo_origem FROM ficha_inscricoes_intervencoes WHERE tipo_origem = 'manutencao_pre_projeto'
    UNION ALL
    SELECT origem FROM ficha_placa WHERE origem = 'manutencao_pre_projeto'
    UNION ALL
    SELECT origem FROM defensas WHERE origem = 'manutencao_pre_projeto'
  ) sub;

  IF v_count > 0 THEN
    RAISE WARNING 'ATENÇÃO: Ainda existem % registros com valor antigo!', v_count;
  ELSE
    RAISE NOTICE 'SUCESSO: Todos os registros foram atualizados para manutencao_rotineira!';
  END IF;
END $$;