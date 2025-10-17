-- ===================================================
-- FASE 2: ATUALIZAR AS 7 FUNÇÕES aplicar_intervencao_*()
-- ===================================================

-- 2.1. PLACAS (Pontual)
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
$function$;

-- 2.2. PÓRTICOS (Pontual)
CREATE OR REPLACE FUNCTION public.aplicar_intervencao_portico(p_intervencao_id uuid, p_coordenador_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude, longitude_inicial),
        modificado_por_intervencao = true,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = now()
      WHERE id = v_portico_id;
    
    ELSE
      UPDATE public.ficha_porticos SET
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude, longitude_inicial),
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
$function$;

-- 2.3. INSCRIÇÕES/ZEBRADOS (Pontual)
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
BEGIN
  SELECT * INTO v_intervencao 
  FROM public.ficha_inscricoes_intervencoes 
  WHERE id = p_intervencao_id;

  IF v_intervencao.ficha_inscricoes_id IS NULL THEN
    RAISE EXCEPTION 'Intervenção não encontrada ou sem inscrição associada';
  END IF;

  v_inscricao_id := v_intervencao.ficha_inscricoes_id;

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
    aplicado_por
  ) VALUES (
    v_inscricao_id,
    p_intervencao_id,
    v_inscricao_antes,
    v_inscricao_depois,
    p_coordenador_id
  );

  UPDATE public.ficha_inscricoes_intervencoes SET
    aplicado_ao_inventario = true,
    pendente_aprovacao_coordenador = false,
    coordenador_id = p_coordenador_id,
    data_aprovacao_coordenador = now()
  WHERE id = p_intervencao_id;
END;
$function$;