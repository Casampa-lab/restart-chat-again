-- ETAPA 6 - MARCAS LONGITUDINAIS: Adicionar campos de inventário dinâmico

-- Adicionar 5 campos na tabela ficha_marcas_longitudinais_intervencoes
ALTER TABLE ficha_marcas_longitudinais_intervencoes
ADD COLUMN IF NOT EXISTS km_inicial numeric,
ADD COLUMN IF NOT EXISTS km_final numeric,
ADD COLUMN IF NOT EXISTS snv text,
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric;

-- Atualizar função aplicar_intervencao_marcas_longitudinais para incluir os novos campos
CREATE OR REPLACE FUNCTION public.aplicar_intervencao_marcas_longitudinais(
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