-- Migration: Improve match_pontual with KM fallback, TOP-N, and normalization
-- Card 1: Fazer Placas/Porticos/Inscrições funcionarem como Cilindros

-- Drop existing function (will be recreated)
DROP FUNCTION IF EXISTS match_pontual(tipo_elemento_enum, NUMERIC, NUMERIC, UUID, JSONB, TEXT);

-- Update match_decision_enum to include new values
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MULTIPLE_CANDIDATES' AND enumtypid = 'match_decision_enum'::regtype) THEN
        ALTER TYPE match_decision_enum ADD VALUE 'MULTIPLE_CANDIDATES';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'GRAY_ZONE' AND enumtypid = 'match_decision_enum'::regtype) THEN
        ALTER TYPE match_decision_enum ADD VALUE 'GRAY_ZONE';
    END IF;
END $$;

-- Helper function: normalize 'lado' attribute
CREATE OR REPLACE FUNCTION normalize_lado(lado_value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF lado_value IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Normalize to BD, BE, or EIXO
  CASE UPPER(TRIM(lado_value))
    WHEN 'DIREITA' THEN RETURN 'BD';
    WHEN 'D' THEN RETURN 'BD';
    WHEN 'BD' THEN RETURN 'BD';
    WHEN 'ESQUERDA' THEN RETURN 'BE';
    WHEN 'E' THEN RETURN 'BE';
    WHEN 'BE' THEN RETURN 'BE';
    WHEN 'EIXO' THEN RETURN 'EIXO';
    WHEN 'CENTRO' THEN RETURN 'EIXO';
    WHEN 'CENTRAL' THEN RETURN 'EIXO';
    ELSE RETURN UPPER(TRIM(lado_value));
  END CASE;
END;
$$;

-- Helper function: normalize 'codigo' attribute
CREATE OR REPLACE FUNCTION normalize_codigo(codigo_value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF codigo_value IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove spaces and convert to uppercase
  RETURN UPPER(REGEXP_REPLACE(TRIM(codigo_value), '\s+', '', 'g'));
END;
$$;

-- Recreate match_pontual with improvements
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
  v_km_nec NUMERIC;
  v_count_perfect INTEGER := 0;
  v_count_gray INTEGER := 0;
  v_attr_nec TEXT;
  v_attr_cad TEXT;
  v_best_candidate RECORD;
  v_best_divergencias TEXT[];
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
  
  -- Branch 1: GPS coordinates available (p_lat AND p_lon not NULL)
  IF p_lat IS NOT NULL AND p_lon IS NOT NULL THEN
    -- Processar TODOS os candidatos dentro da tolerância (TOP-N, não LIMIT 1)
    FOR v_candidato IN EXECUTE format('
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
    ', v_tabela, v_tabela)
    USING p_lat, p_lon, p_rodovia_id
    LOOP
      v_distancia := v_candidato.distancia;
      
      -- Se candidato está além da tolerância de substituição, parar
      IF v_distancia > v_params.tol_dist_substituicao_m THEN
        EXIT;
      END IF;
      
      v_divergencias := '{}';
      
      -- Comparar atributos com normalização
      FOREACH v_attr IN ARRAY v_atributos_req LOOP
        v_attr_nec := p_atributos->>v_attr;
        v_attr_cad := v_candidato.dados->>v_attr;
        
        -- Normalizar 'lado'
        IF v_attr = 'lado' THEN
          v_attr_nec := normalize_lado(v_attr_nec);
          v_attr_cad := normalize_lado(v_attr_cad);
        END IF;
        
        -- Normalizar 'codigo'
        IF v_attr = 'codigo' THEN
          v_attr_nec := normalize_codigo(v_attr_nec);
          v_attr_cad := normalize_codigo(v_attr_cad);
        END IF;
        
        -- Comparar
        IF v_attr_nec IS DISTINCT FROM v_attr_cad THEN
          v_divergencias := array_append(v_divergencias, v_attr);
        END IF;
      END LOOP;
      
      -- Contar candidatos perfeitos (dentro de tol_dist_m)
      IF v_distancia <= v_params.tol_dist_m THEN
        v_count_perfect := v_count_perfect + 1;
        
        -- Guardar o primeiro candidato perfeito
        IF v_count_perfect = 1 THEN
          v_best_candidate := v_candidato;
          v_best_divergencias := v_divergencias;
        END IF;
      ELSE
        -- Candidato na faixa cinza (entre tol_dist_m e tol_dist_substituicao_m)
        v_count_gray := v_count_gray + 1;
        
        IF v_count_gray = 1 AND v_count_perfect = 0 THEN
          v_best_candidate := v_candidato;
          v_best_divergencias := v_divergencias;
        END IF;
      END IF;
    END LOOP;
    
  -- Branch 2: GPS coordinates NULL - fallback to KM
  ELSE
    v_km_nec := (p_atributos->>'km_inicial')::NUMERIC;
    
    IF v_km_nec IS NULL THEN
      v_result.cadastro_id := NULL;
      v_result.decision := 'NO_MATCH';
      v_result.match_score := 0;
      v_result.reason_code := 'NO_GPS_NO_KM';
      v_result.distancia_metros := NULL;
      v_result.atributos_divergentes := '{}';
      RETURN v_result;
    END IF;
    
    -- Processar candidatos por proximidade de KM
    FOR v_candidato IN EXECUTE format('
      SELECT 
        id,
        ABS(km_inicial - $1) * 1000 AS distancia,
        to_jsonb(%I.*) AS dados
      FROM %I
      WHERE rodovia_id = $2
        AND ativo = TRUE
        AND ABS(km_inicial - $1) * 1000 <= $3
      ORDER BY distancia
    ', v_tabela, v_tabela)
    USING v_km_nec, p_rodovia_id, v_params.tol_dist_substituicao_m
    LOOP
      v_distancia := v_candidato.distancia;
      v_divergencias := '{}';
      
      -- Comparar atributos com normalização
      FOREACH v_attr IN ARRAY v_atributos_req LOOP
        v_attr_nec := p_atributos->>v_attr;
        v_attr_cad := v_candidato.dados->>v_attr;
        
        -- Normalizar 'lado'
        IF v_attr = 'lado' THEN
          v_attr_nec := normalize_lado(v_attr_nec);
          v_attr_cad := normalize_lado(v_attr_cad);
        END IF;
        
        -- Normalizar 'codigo'
        IF v_attr = 'codigo' THEN
          v_attr_nec := normalize_codigo(v_attr_nec);
          v_attr_cad := normalize_codigo(v_attr_cad);
        END IF;
        
        -- Comparar
        IF v_attr_nec IS DISTINCT FROM v_attr_cad THEN
          v_divergencias := array_append(v_divergencias, v_attr);
        END IF;
      END LOOP;
      
      -- Contar candidatos perfeitos (dentro de tol_dist_m)
      IF v_distancia <= v_params.tol_dist_m THEN
        v_count_perfect := v_count_perfect + 1;
        
        IF v_count_perfect = 1 THEN
          v_best_candidate := v_candidato;
          v_best_divergencias := v_divergencias;
        END IF;
      ELSE
        v_count_gray := v_count_gray + 1;
        
        IF v_count_gray = 1 AND v_count_perfect = 0 THEN
          v_best_candidate := v_candidato;
          v_best_divergencias := v_divergencias;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  -- Se não há candidatos
  IF v_count_perfect = 0 AND v_count_gray = 0 THEN
    v_result.cadastro_id := NULL;
    v_result.decision := 'NO_MATCH';
    v_result.match_score := 0;
    v_result.reason_code := 'NO_CADASTRO_NEARBY';
    v_result.distancia_metros := NULL;
    v_result.atributos_divergentes := '{}';
    RETURN v_result;
  END IF;
  
  -- Preencher resultado com o melhor candidato
  v_result.cadastro_id := v_best_candidate.id;
  v_result.distancia_metros := v_best_candidate.distancia;
  v_result.atributos_divergentes := v_best_divergencias;
  v_score := GREATEST(0, 1 - (v_best_candidate.distancia / v_params.tol_dist_substituicao_m));
  v_result.match_score := ROUND(v_score, 3);
  
  -- Decisão baseada em contagem
  IF v_count_perfect >= 2 THEN
    -- Múltiplos candidatos perfeitos
    v_result.decision := 'AMBIGUOUS';
    v_result.reason_code := 'MULTIPLE_CANDIDATES';
  ELSIF v_count_perfect = 1 THEN
    -- Exatamente 1 candidato perfeito
    IF array_length(v_best_divergencias, 1) IS NULL OR array_length(v_best_divergencias, 1) = 0 THEN
      v_result.decision := 'MATCH_DIRECT';
      v_result.reason_code := 'PERFECT_MATCH';
    ELSE
      v_result.decision := 'SUBSTITUICAO';
      v_result.reason_code := 'ATTR_MISMATCH_SAME_LOCATION';
    END IF;
  ELSIF v_count_gray > 0 THEN
    -- Nenhum candidato perfeito, mas há candidatos na faixa cinza
    IF v_count_gray >= 2 THEN
      v_result.decision := 'AMBIGUOUS';
      v_result.reason_code := 'GRAY_ZONE_MULTIPLE';
    ELSE
      v_result.decision := 'AMBIGUOUS';
      v_result.reason_code := 'GRAY_ZONE';
    END IF;
  ELSE
    -- Fallback (não deveria chegar aqui)
    v_result.decision := 'NO_MATCH';
    v_result.reason_code := 'UNEXPECTED_STATE';
  END IF;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION match_pontual TO authenticated;
GRANT EXECUTE ON FUNCTION normalize_lado TO authenticated;
GRANT EXECUTE ON FUNCTION normalize_codigo TO authenticated;

COMMENT ON FUNCTION match_pontual IS 'Match elementos pontuais com fallback por KM, TOP-N, normalização de atributos';
COMMENT ON FUNCTION normalize_lado IS 'Normaliza atributo lado para BD/BE/EIXO';
COMMENT ON FUNCTION normalize_codigo IS 'Normaliza atributo codigo para UPPERCASE sem espaços';