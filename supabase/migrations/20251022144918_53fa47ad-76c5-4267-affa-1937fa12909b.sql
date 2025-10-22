-- Corrigir função match_linear para garantir SRID 4326 na geometria recebida
CREATE OR REPLACE FUNCTION public.match_linear(
  p_tipo tipo_elemento_enum, 
  p_geom_necessidade geometry, 
  p_rodovia_id uuid, 
  p_atributos jsonb, 
  p_servico text
)
RETURNS match_result
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_result match_result;
  v_params RECORD;
  v_tabela TEXT;
  v_candidato RECORD;
  v_length_nec NUMERIC;
  v_overlap_ratio NUMERIC;
  v_atributos_req TEXT[];
  v_divergencias TEXT[] := '{}';
  v_attr TEXT;
  v_geom_with_srid geometry;
BEGIN
  -- Forçar SRID 4326 na geometria recebida para evitar erro de mixed SRID
  v_geom_with_srid := ST_SetSRID(p_geom_necessidade, 4326);
  
  IF v_geom_with_srid IS NULL OR ST_IsEmpty(v_geom_with_srid) THEN
    v_result.decision := 'NO_MATCH';
    v_result.reason_code := 'INVALID_GEOMETRY';
    v_result.match_score := 0;
    v_result.cadastro_id := NULL;
    v_result.distancia_metros := NULL;
    v_result.atributos_divergentes := '{}';
    RETURN v_result;
  END IF;
  
  SELECT * INTO v_params
  FROM param_tolerancias_match
  WHERE tipo = p_tipo AND ativo = TRUE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parâmetros não encontrados para tipo %', p_tipo;
  END IF;
  
  v_tabela := CASE p_tipo
    WHEN 'MARCA_LONG' THEN 'ficha_marcas_longitudinais'
    WHEN 'TACHAS' THEN 'ficha_tachas'
    WHEN 'DEFENSA' THEN 'defensas'
    WHEN 'CILINDRO' THEN 'ficha_cilindros'
    ELSE NULL
  END;
  
  IF v_tabela IS NULL THEN
    RAISE EXCEPTION 'Tipo % não é linear', p_tipo;
  END IF;
  
  v_length_nec := ST_Length(v_geom_with_srid::geography);
  
  -- Usar v_geom_with_srid em vez de p_geom_necessidade
  EXECUTE format('
    WITH candidatos AS (
      SELECT 
        id,
        geom_line,
        ST_Length(ST_Intersection(geom_line, $1)::geography) AS overlap_length,
        ST_Length(geom_line::geography) AS length_cadastro,
        to_jsonb(%I.*) AS dados
      FROM %I
      WHERE rodovia_id = $2
        AND ativo = TRUE
        AND geom_line IS NOT NULL
        AND ST_Intersects(geom_line, $1)
    )
    SELECT *,
      ROUND((overlap_length / NULLIF($3, 0))::NUMERIC, 3) AS overlap_ratio
    FROM candidatos
    ORDER BY overlap_length DESC
    LIMIT 1
  ', v_tabela, v_tabela)
  INTO v_candidato
  USING v_geom_with_srid, p_rodovia_id, v_length_nec;
  
  IF v_candidato IS NULL THEN
    v_result.cadastro_id := NULL;
    v_result.decision := 'NO_MATCH';
    v_result.match_score := 0;
    v_result.reason_code := 'NO_OVERLAP_FOUND';
    v_result.distancia_metros := NULL;
    v_result.atributos_divergentes := '{}';
    RETURN v_result;
  END IF;
  
  v_overlap_ratio := v_candidato.overlap_ratio;
  v_result.cadastro_id := v_candidato.id;
  v_result.distancia_metros := NULL;
  v_result.match_score := v_overlap_ratio;
  
  SELECT ARRAY(SELECT jsonb_array_elements_text(v_params.atributos_match))
  INTO v_atributos_req;
  
  FOREACH v_attr IN ARRAY v_atributos_req LOOP
    IF (p_atributos->>v_attr) IS DISTINCT FROM (v_candidato.dados->>v_attr) THEN
      v_divergencias := array_append(v_divergencias, v_attr);
    END IF;
  END LOOP;
  
  v_result.atributos_divergentes := v_divergencias;
  
  IF v_overlap_ratio >= v_params.tol_overlap_match THEN
    IF array_length(v_divergencias, 1) IS NULL OR array_length(v_divergencias, 1) = 0 THEN
      v_result.decision := 'MATCH_DIRECT';
      v_result.reason_code := 'HIGH_OVERLAP_PERFECT_ATTR';
    ELSE
      v_result.decision := 'SUBSTITUICAO';
      v_result.reason_code := 'HIGH_OVERLAP_ATTR_MISMATCH';
    END IF;
  ELSIF v_overlap_ratio BETWEEN v_params.tol_overlap_amb_low AND v_params.tol_overlap_amb_high THEN
    v_result.decision := 'AMBIGUOUS';
    v_result.reason_code := 'OVERLAP_IN_GRAY_ZONE';
  ELSE
    v_result.decision := 'NO_MATCH';
    v_result.reason_code := 'OVERLAP_LT_THRESHOLD';
  END IF;
  
  RETURN v_result;
END;
$function$;

-- Comentário explicativo
COMMENT ON FUNCTION public.match_linear IS 'Função de matching para elementos lineares. Corrigida para forçar SRID 4326 na geometria de entrada, evitando erros de mixed SRID.';