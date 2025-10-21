-- Migration: Create match_pontual function for point-based matching
-- Tarefa 2: Função de Match para PONTUAIS (distância + atributos)

-- Create match decision enum
CREATE TYPE match_decision_enum AS ENUM (
  'MATCH_DIRECT',
  'SUBSTITUICAO',
  'AMBIGUOUS',
  'NO_MATCH'
);

-- Create match result composite type
CREATE TYPE match_result AS (
  cadastro_id UUID,
  decision match_decision_enum,
  match_score NUMERIC,
  reason_code TEXT,
  distancia_metros NUMERIC,
  atributos_divergentes TEXT[]
);

-- Main function: match_pontual
CREATE OR REPLACE FUNCTION match_pontual(
  p_tipo tipo_elemento_enum,
  p_lat NUMERIC,
  p_lon NUMERIC,
  p_rodovia_id UUID,
  p_atributos JSONB,
  p_servico TEXT
) RETURNS match_result
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_result match_result;
  v_params RECORD;
  v_tabela TEXT;
  v_candidato RECORD;
  v_distancia NUMERIC;
  v_atributos_req TEXT[];
  v_divergencias TEXT[] := '{}';
  v_score NUMERIC;
  v_attr TEXT;
BEGIN
  -- Buscar parâmetros
  SELECT * INTO v_params
  FROM param_tolerancias_match
  WHERE tipo = p_tipo AND ativo = TRUE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parâmetros não encontrados para tipo %', p_tipo;
  END IF;
  
  -- Determinar tabela de cadastro
  v_tabela := CASE p_tipo
    WHEN 'PLACA' THEN 'ficha_placa'
    WHEN 'PORTICO' THEN 'ficha_porticos'
    WHEN 'INSCRICAO' THEN 'ficha_inscricoes'
    ELSE NULL
  END;
  
  IF v_tabela IS NULL THEN
    RAISE EXCEPTION 'Tipo % não é pontual', p_tipo;
  END IF;
  
  -- Extrair atributos requeridos
  SELECT ARRAY(SELECT jsonb_array_elements_text(v_params.atributos_match))
  INTO v_atributos_req;
  
  -- Buscar candidato mais próximo usando Haversine
  EXECUTE format('
    SELECT 
      id,
      ROUND(6371000 * acos(LEAST(1.0, GREATEST(-1.0,
        cos(radians($1)) * cos(radians(latitude_inicial)) *
        cos(radians(longitude_inicial) - radians($2)) +
        sin(radians($1)) * sin(radians(latitude_inicial))
      ))))::NUMERIC AS distancia,
      to_jsonb(%I.*) AS dados
    FROM %I
    WHERE rodovia_id = $3
      AND ativo = TRUE
      AND latitude_inicial IS NOT NULL
      AND longitude_inicial IS NOT NULL
      AND latitude_inicial BETWEEN $1 - 0.01 AND $1 + 0.01
      AND longitude_inicial BETWEEN $2 - 0.01 AND $2 + 0.01
    ORDER BY distancia
    LIMIT 1
  ', v_tabela, v_tabela)
  INTO v_candidato
  USING p_lat, p_lon, p_rodovia_id;
  
  IF v_candidato IS NULL THEN
    v_result.cadastro_id := NULL;
    v_result.decision := 'NO_MATCH';
    v_result.match_score := 0;
    v_result.reason_code := 'NO_CADASTRO_NEARBY';
    v_result.distancia_metros := NULL;
    v_result.atributos_divergentes := '{}';
    RETURN v_result;
  END IF;
  
  v_distancia := v_candidato.distancia;
  v_result.cadastro_id := v_candidato.id;
  v_result.distancia_metros := v_distancia;
  
  IF v_distancia > v_params.tol_dist_substituicao_m THEN
    v_result.decision := 'NO_MATCH';
    v_result.match_score := 0;
    v_result.reason_code := 'DIST_GT_THRESHOLD';
    v_result.atributos_divergentes := '{}';
    RETURN v_result;
  END IF;
  
  FOREACH v_attr IN ARRAY v_atributos_req LOOP
    IF (p_atributos->>v_attr) IS DISTINCT FROM (v_candidato.dados->>v_attr) THEN
      v_divergencias := array_append(v_divergencias, v_attr);
    END IF;
  END LOOP;
  
  v_score := GREATEST(0, 1 - (v_distancia / v_params.tol_dist_substituicao_m));
  v_result.match_score := ROUND(v_score, 3);
  v_result.atributos_divergentes := v_divergencias;
  
  IF v_distancia <= v_params.tol_dist_m THEN
    IF array_length(v_divergencias, 1) IS NULL OR array_length(v_divergencias, 1) = 0 THEN
      v_result.decision := 'MATCH_DIRECT';
      v_result.reason_code := 'PERFECT_MATCH';
    ELSIF 'lado' = ANY(v_divergencias) THEN
      v_result.decision := 'AMBIGUOUS';
      v_result.reason_code := 'SIDE_MISMATCH';
    ELSE
      v_result.decision := 'SUBSTITUICAO';
      v_result.reason_code := 'ATTR_MISMATCH_SAME_LOCATION';
    END IF;
  ELSE
    v_result.decision := 'AMBIGUOUS';
    v_result.reason_code := 'DIST_IN_GRAY_ZONE';
  END IF;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION match_pontual TO authenticated;

COMMENT ON FUNCTION match_pontual IS 'Match elementos pontuais considerando distância GPS + similaridade de atributos';
