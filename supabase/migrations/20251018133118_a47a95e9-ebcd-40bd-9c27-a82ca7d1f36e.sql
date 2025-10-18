-- ETAPA 1 - PÓRTICOS: Adicionar campos para Inventário Dinâmico
ALTER TABLE ficha_porticos_intervencoes
ADD COLUMN km numeric,
ADD COLUMN snv text,
ADD COLUMN descricao text;

-- Atualizar função aplicar_intervencao_portico para incluir novos campos
CREATE OR REPLACE FUNCTION public.aplicar_intervencao_portico(
  p_intervencao_id uuid,
  p_coordenador_id uuid
)
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
        km = COALESCE(v_intervencao.km, km),
        snv = COALESCE(v_intervencao.snv, snv),
        descricao = COALESCE(v_intervencao.descricao, descricao),
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