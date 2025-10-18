-- Etapa 7: Inventário Dinâmico - Cilindros Delimitadores
-- Adicionar campos necessários para o inventário dinâmico de cilindros

-- Adicionar colunas à tabela ficha_cilindros_intervencoes se ainda não existirem
DO $$ 
BEGIN
  -- km_inicial
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ficha_cilindros_intervencoes' 
    AND column_name = 'km_inicial'
  ) THEN
    ALTER TABLE public.ficha_cilindros_intervencoes 
    ADD COLUMN km_inicial NUMERIC;
  END IF;

  -- km_final
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ficha_cilindros_intervencoes' 
    AND column_name = 'km_final'
  ) THEN
    ALTER TABLE public.ficha_cilindros_intervencoes 
    ADD COLUMN km_final NUMERIC;
  END IF;

  -- snv
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ficha_cilindros_intervencoes' 
    AND column_name = 'snv'
  ) THEN
    ALTER TABLE public.ficha_cilindros_intervencoes 
    ADD COLUMN snv TEXT;
  END IF;

  -- latitude
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ficha_cilindros_intervencoes' 
    AND column_name = 'latitude'
  ) THEN
    ALTER TABLE public.ficha_cilindros_intervencoes 
    ADD COLUMN latitude NUMERIC;
  END IF;

  -- longitude
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ficha_cilindros_intervencoes' 
    AND column_name = 'longitude'
  ) THEN
    ALTER TABLE public.ficha_cilindros_intervencoes 
    ADD COLUMN longitude NUMERIC;
  END IF;

  -- local_implantacao
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ficha_cilindros_intervencoes' 
    AND column_name = 'local_implantacao'
  ) THEN
    ALTER TABLE public.ficha_cilindros_intervencoes 
    ADD COLUMN local_implantacao TEXT;
  END IF;

  -- espacamento_m
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ficha_cilindros_intervencoes' 
    AND column_name = 'espacamento_m'
  ) THEN
    ALTER TABLE public.ficha_cilindros_intervencoes 
    ADD COLUMN espacamento_m NUMERIC;
  END IF;
END $$;

-- Atualizar a função aplicar_intervencao_cilindros para incluir os novos campos
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
        km_inicial = COALESCE(v_intervencao.km_inicial, km_inicial),
        km_final = COALESCE(v_intervencao.km_final, km_final),
        snv = COALESCE(v_intervencao.snv, snv),
        local_implantacao = COALESCE(v_intervencao.local_implantacao, local_implantacao),
        espacamento_m = COALESCE(v_intervencao.espacamento_m, espacamento_m),
        extensao_km = COALESCE(v_intervencao.extensao_km, extensao_km),
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