-- ETAPA 4 - TACHAS: Adicionar campos de inventário dinâmico

-- Adicionar 6 campos na tabela ficha_tachas_intervencoes
ALTER TABLE ficha_tachas_intervencoes
ADD COLUMN IF NOT EXISTS km_inicial numeric,
ADD COLUMN IF NOT EXISTS km_final numeric,
ADD COLUMN IF NOT EXISTS snv text,
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric,
ADD COLUMN IF NOT EXISTS espacamento_m numeric;

-- Atualizar função aplicar_intervencao_tachas para incluir os novos campos
CREATE OR REPLACE FUNCTION public.aplicar_intervencao_tachas(
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
        km_inicial = COALESCE(v_intervencao.km_inicial, km_inicial),
        km_final = COALESCE(v_intervencao.km_final, km_final),
        snv = COALESCE(v_intervencao.snv, snv),
        espacamento_m = COALESCE(v_intervencao.espacamento_m, espacamento_m),
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