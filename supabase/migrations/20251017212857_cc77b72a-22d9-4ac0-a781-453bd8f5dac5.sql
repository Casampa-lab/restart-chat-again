-- 2.4. MARCAS LONGITUDINAIS (Linear)
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
BEGIN
  SELECT * INTO v_intervencao 
  FROM public.ficha_marcas_longitudinais_intervencoes 
  WHERE id = p_intervencao_id;

  IF v_intervencao.ficha_marcas_longitudinais_id IS NULL THEN
    RAISE EXCEPTION 'Intervenção não encontrada ou sem marca associada';
  END IF;

  v_marca_id := v_intervencao.ficha_marcas_longitudinais_id;

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
    aplicado_por
  ) VALUES (
    v_marca_id,
    p_intervencao_id,
    v_marca_antes,
    v_marca_depois,
    p_coordenador_id
  );

  UPDATE public.ficha_marcas_longitudinais_intervencoes SET
    aplicado_ao_inventario = true,
    pendente_aprovacao_coordenador = false,
    coordenador_id = p_coordenador_id,
    data_aprovacao_coordenador = now()
  WHERE id = p_intervencao_id;
END;
$function$;

-- 2.5. CILINDROS (Linear)
CREATE OR REPLACE FUNCTION public.aplicar_intervencao_cilindros(p_intervencao_id uuid, p_coordenador_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_intervencao RECORD;
  v_cilindro_antes jsonb;
  v_cilindro_depois jsonb;
  v_cilindro_id uuid;
BEGIN
  SELECT * INTO v_intervencao 
  FROM public.ficha_cilindros_intervencoes 
  WHERE id = p_intervencao_id;

  IF v_intervencao.ficha_cilindros_id IS NULL THEN
    RAISE EXCEPTION 'Intervenção não encontrada ou sem cilindro associado';
  END IF;

  v_cilindro_id := v_intervencao.ficha_cilindros_id;

  SELECT to_jsonb(ficha_cilindros.*) INTO v_cilindro_antes
  FROM public.ficha_cilindros
  WHERE id = v_cilindro_id;

  CASE v_intervencao.motivo
    WHEN 'Substituição', 'Implantação' THEN
      UPDATE public.ficha_cilindros SET
        cor_corpo = COALESCE(v_intervencao.cor_corpo, cor_corpo),
        cor_refletivo = COALESCE(v_intervencao.cor_refletivo, cor_refletivo),
        tipo_refletivo = COALESCE(v_intervencao.tipo_refletivo, tipo_refletivo),
        quantidade = COALESCE(v_intervencao.quantidade, quantidade),
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude, longitude_inicial),
        modificado_por_intervencao = true,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = now()
      WHERE id = v_cilindro_id;
    
    ELSE
      UPDATE public.ficha_cilindros SET
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude, longitude_inicial),
        modificado_por_intervencao = true,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = now()
      WHERE id = v_cilindro_id;
  END CASE;

  SELECT to_jsonb(ficha_cilindros.*) INTO v_cilindro_depois
  FROM public.ficha_cilindros
  WHERE id = v_cilindro_id;

  INSERT INTO public.ficha_cilindros_historico (
    cadastro_id,
    intervencao_id,
    dados_antes,
    dados_depois,
    aplicado_por
  ) VALUES (
    v_cilindro_id,
    p_intervencao_id,
    v_cilindro_antes,
    v_cilindro_depois,
    p_coordenador_id
  );

  UPDATE public.ficha_cilindros_intervencoes SET
    aplicado_ao_inventario = true,
    pendente_aprovacao_coordenador = false,
    coordenador_id = p_coordenador_id,
    data_aprovacao_coordenador = now()
  WHERE id = p_intervencao_id;
END;
$function$;

-- 2.6. DEFENSAS (Linear)
CREATE OR REPLACE FUNCTION public.aplicar_intervencao_defensas(p_intervencao_id uuid, p_coordenador_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_intervencao RECORD;
  v_defensa_antes jsonb;
  v_defensa_depois jsonb;
  v_defensa_id uuid;
BEGIN
  SELECT * INTO v_intervencao 
  FROM public.defensas_intervencoes 
  WHERE id = p_intervencao_id;

  IF v_intervencao.defensa_id IS NULL THEN
    RAISE EXCEPTION 'Intervenção não encontrada ou sem defensa associada';
  END IF;

  v_defensa_id := v_intervencao.defensa_id;

  SELECT to_jsonb(defensas.*) INTO v_defensa_antes
  FROM public.defensas
  WHERE id = v_defensa_id;

  CASE v_intervencao.motivo
    WHEN 'Substituição', 'Recuperação' THEN
      UPDATE public.defensas SET
        tipo_defensa = COALESCE(v_intervencao.tipo_defensa, tipo_defensa),
        extensao_metros = COALESCE(v_intervencao.extensao_metros, extensao_metros),
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude, longitude_inicial),
        modificado_por_intervencao = true,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = now()
      WHERE id = v_defensa_id;
    
    ELSE
      UPDATE public.defensas SET
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude, longitude_inicial),
        modificado_por_intervencao = true,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = now()
      WHERE id = v_defensa_id;
  END CASE;

  SELECT to_jsonb(defensas.*) INTO v_defensa_depois
  FROM public.defensas
  WHERE id = v_defensa_id;

  INSERT INTO public.defensas_historico (
    cadastro_id,
    intervencao_id,
    dados_antes,
    dados_depois,
    aplicado_por
  ) VALUES (
    v_defensa_id,
    p_intervencao_id,
    v_defensa_antes,
    v_defensa_depois,
    p_coordenador_id
  );

  UPDATE public.defensas_intervencoes SET
    aplicado_ao_inventario = true,
    pendente_aprovacao_coordenador = false,
    coordenador_id = p_coordenador_id,
    data_aprovacao_coordenador = now()
  WHERE id = p_intervencao_id;
END;
$function$;

-- 2.7. TACHAS (Linear)
CREATE OR REPLACE FUNCTION public.aplicar_intervencao_tachas(p_intervencao_id uuid, p_coordenador_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_intervencao RECORD;
  v_tacha_antes jsonb;
  v_tacha_depois jsonb;
  v_tacha_id uuid;
BEGIN
  SELECT * INTO v_intervencao 
  FROM public.ficha_tachas_intervencoes 
  WHERE id = p_intervencao_id;

  IF v_intervencao.ficha_tachas_id IS NULL THEN
    RAISE EXCEPTION 'Intervenção não encontrada ou sem tacha associada';
  END IF;

  v_tacha_id := v_intervencao.ficha_tachas_id;

  SELECT to_jsonb(ficha_tachas.*) INTO v_tacha_antes
  FROM public.ficha_tachas
  WHERE id = v_tacha_id;

  CASE v_intervencao.motivo
    WHEN 'Substituição', 'Implantação', 'Reposição' THEN
      UPDATE public.ficha_tachas SET
        tipo_tacha = COALESCE(v_intervencao.tipo_tacha, tipo_tacha),
        cor = COALESCE(v_intervencao.cor, cor),
        lado = COALESCE(v_intervencao.lado, lado),
        quantidade = COALESCE(v_intervencao.quantidade, quantidade),
        material = COALESCE(v_intervencao.material, material),
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude, longitude_inicial),
        modificado_por_intervencao = true,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = now()
      WHERE id = v_tacha_id;
    
    ELSE
      UPDATE public.ficha_tachas SET
        fotos_urls = COALESCE(v_intervencao.fotos_urls, fotos_urls),
        latitude_inicial = COALESCE(v_intervencao.latitude, latitude_inicial),
        longitude_inicial = COALESCE(v_intervencao.longitude, longitude_inicial),
        modificado_por_intervencao = true,
        ultima_intervencao_id = p_intervencao_id,
        data_ultima_modificacao = now()
      WHERE id = v_tacha_id;
  END CASE;

  SELECT to_jsonb(ficha_tachas.*) INTO v_tacha_depois
  FROM public.ficha_tachas
  WHERE id = v_tacha_id;

  INSERT INTO public.ficha_tachas_historico (
    cadastro_id,
    intervencao_id,
    dados_antes,
    dados_depois,
    aplicado_por
  ) VALUES (
    v_tacha_id,
    p_intervencao_id,
    v_tacha_antes,
    v_tacha_depois,
    p_coordenador_id
  );

  UPDATE public.ficha_tachas_intervencoes SET
    aplicado_ao_inventario = true,
    pendente_aprovacao_coordenador = false,
    coordenador_id = p_coordenador_id,
    data_aprovacao_coordenador = now()
  WHERE id = p_intervencao_id;
END;
$function$;