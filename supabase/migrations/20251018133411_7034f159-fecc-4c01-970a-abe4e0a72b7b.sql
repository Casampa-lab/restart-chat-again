-- ETAPA 2 - INSCRIÇÕES/ZEBRADOS: Adicionar campos para Inventário Dinâmico
ALTER TABLE ficha_inscricoes_intervencoes
ADD COLUMN km_inicial numeric,
ADD COLUMN km_final numeric,
ADD COLUMN snv text;

-- Atualizar função aplicar_intervencao_inscricoes para incluir novos campos
CREATE OR REPLACE FUNCTION public.aplicar_intervencao_inscricoes(
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