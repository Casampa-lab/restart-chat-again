-- ETAPA 5 - DEFENSAS: Adicionar campos de inventário dinâmico

-- Adicionar 4 campos na tabela defensas_intervencoes
ALTER TABLE defensas_intervencoes
ADD COLUMN IF NOT EXISTS km_inicial numeric,
ADD COLUMN IF NOT EXISTS km_final numeric,
ADD COLUMN IF NOT EXISTS snv text,
ADD COLUMN IF NOT EXISTS lado text;

-- Atualizar função aplicar_intervencao_defensas para incluir os novos campos
CREATE OR REPLACE FUNCTION public.aplicar_intervencao_defensas(
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
    WHEN 'Substituição', 'Recuperação', 'Implantação' THEN
      UPDATE public.defensas SET
        tipo_defensa = COALESCE(v_intervencao.tipo_defensa, tipo_defensa),
        extensao_metros = COALESCE(v_intervencao.extensao_metros, extensao_metros),
        km_inicial = COALESCE(v_intervencao.km_inicial, km_inicial),
        km_final = COALESCE(v_intervencao.km_final, km_final),
        snv = COALESCE(v_intervencao.snv, snv),
        lado = COALESCE(v_intervencao.lado, lado),
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