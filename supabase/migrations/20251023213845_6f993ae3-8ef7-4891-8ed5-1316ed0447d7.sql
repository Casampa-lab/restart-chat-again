-- Correção da função match_pontual para contar v_count_perfect apenas com atributos idênticos
-- Corrige bug onde candidatos com divergências de atributos eram contados como "perfeitos"

CREATE OR REPLACE FUNCTION match_pontual(
  p_tipo TEXT,
  p_lat NUMERIC,
  p_lon NUMERIC,
  p_rodovia_id TEXT,
  p_atributos JSONB,
  p_servico TEXT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
  v_params RECORD;
  v_tabela TEXT;
  v_atributos_req TEXT[];
  v_candidato RECORD;
  v_best_candidate RECORD;
  v_distancia NUMERIC;
  v_km_nec NUMERIC;
  v_count_perfect INT := 0;
  v_count_gray INT := 0;
  v_divergencias TEXT[];
  v_best_divergencias TEXT[];
  v_attr TEXT;
  v_attr_nec TEXT;
  v_attr_cad TEXT;
  v_score NUMERIC;
BEGIN
  -- Buscar parâmetros
  SELECT * INTO v_params
  FROM param_tolerancias_match
  WHERE tipo_elemento = p_tipo;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parâmetros de matching não encontrados para tipo: %', p_tipo;
  END IF;
  
  v_tabela := v_params.tabela_cadastro;
  v_atributos_req := v_params.atributos_obrigatorios;
  
  -- Branch 1: GPS coordinates present
  IF p_lat IS NOT NULL AND p_lon IS NOT NULL THEN
    FOR v_candidato IN EXECUTE format('
      SELECT 
        id,
        ST_Distance(
          ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) AS distancia,
        to_jsonb(%I.*) AS dados
      FROM %I
      WHERE rodovia_id = $3
        AND ativo = TRUE
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $4
        )
      ORDER BY distancia
    ', v_tabela, v_tabela)
    USING p_lon, p_lat, p_rodovia_id, v_params.tol_dist_substituicao_m
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
      
      -- ✅ CORREÇÃO: só conta como perfeito se distância OK E sem divergências
      IF v_distancia <= v_params.tol_dist_m THEN
        IF array_length(v_divergencias, 1) IS NULL OR array_length(v_divergencias, 1) = 0 THEN
          -- Candidato perfeito: distância + atributos corretos
          v_count_perfect := v_count_perfect + 1;
          
          IF v_count_perfect = 1 THEN
            v_best_candidate := v_candidato;
            v_best_divergencias := v_divergencias;
          END IF;
        ELSE
          -- Distância OK mas atributos divergentes → zona cinza
          v_count_gray := v_count_gray + 1;
          
          IF v_count_gray = 1 AND v_count_perfect = 0 THEN
            v_best_candidate := v_candidato;
            v_best_divergencias := v_divergencias;
          END IF;
        END IF;
      ELSIF v_distancia <= v_params.tol_dist_substituicao_m THEN
        -- Candidato na faixa cinza (distância entre tol_dist_m e tol_dist_substituicao_m)
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
      RETURN jsonb_build_object(
        'cadastro_id', NULL,
        'decision', 'NO_MATCH',
        'match_score', 0,
        'reason_code', 'NO_GPS_NO_KM',
        'distancia_metros', NULL,
        'atributos_divergentes', '[]'
      );
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
      
      -- ✅ CORREÇÃO: mesma lógica para branch KM
      IF v_distancia <= v_params.tol_dist_m THEN
        IF array_length(v_divergencias, 1) IS NULL OR array_length(v_divergencias, 1) = 0 THEN
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
      ELSIF v_distancia <= v_params.tol_dist_substituicao_m THEN
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
    RETURN jsonb_build_object(
      'cadastro_id', NULL,
      'decision', 'NO_MATCH',
      'match_score', 0,
      'reason_code', 'NO_CADASTRO_NEARBY',
      'distancia_metros', NULL,
      'atributos_divergentes', '[]'
    );
  END IF;
  
  -- Preencher resultado com o melhor candidato
  v_score := GREATEST(0, 1 - (v_best_candidate.distancia / v_params.tol_dist_substituicao_m));
  
  -- Decisão baseada em contagem
  IF v_count_perfect >= 2 THEN
    RETURN jsonb_build_object(
      'cadastro_id', v_best_candidate.id,
      'decision', 'AMBIGUOUS',
      'match_score', ROUND(v_score, 3),
      'reason_code', 'MULTIPLE_CANDIDATES',
      'distancia_metros', v_best_candidate.distancia,
      'atributos_divergentes', v_best_divergencias
    );
  ELSIF v_count_perfect = 1 THEN
    IF array_length(v_best_divergencias, 1) IS NULL OR array_length(v_best_divergencias, 1) = 0 THEN
      RETURN jsonb_build_object(
        'cadastro_id', v_best_candidate.id,
        'decision', 'MATCH_DIRECT',
        'match_score', ROUND(v_score, 3),
        'reason_code', 'PERFECT_MATCH',
        'distancia_metros', v_best_candidate.distancia,
        'atributos_divergentes', '[]'
      );
    ELSE
      RETURN jsonb_build_object(
        'cadastro_id', v_best_candidate.id,
        'decision', 'SUBSTITUICAO',
        'match_score', ROUND(v_score, 3),
        'reason_code', 'ATTR_MISMATCH_SAME_LOCATION',
        'distancia_metros', v_best_candidate.distancia,
        'atributos_divergentes', v_best_divergencias
      );
    END IF;
  ELSIF v_count_gray > 0 THEN
    IF v_count_gray >= 2 THEN
      RETURN jsonb_build_object(
        'cadastro_id', v_best_candidate.id,
        'decision', 'AMBIGUOUS',
        'match_score', ROUND(v_score, 3),
        'reason_code', 'GRAY_ZONE_MULTIPLE',
        'distancia_metros', v_best_candidate.distancia,
        'atributos_divergentes', v_best_divergencias
      );
    ELSE
      RETURN jsonb_build_object(
        'cadastro_id', v_best_candidate.id,
        'decision', 'AMBIGUOUS',
        'match_score', ROUND(v_score, 3),
        'reason_code', 'GRAY_ZONE',
        'distancia_metros', v_best_candidate.distancia,
        'atributos_divergentes', v_best_divergencias
      );
    END IF;
  ELSE
    -- Fallback (não deveria chegar aqui)
    RETURN jsonb_build_object(
      'cadastro_id', NULL,
      'decision', 'NO_MATCH',
      'match_score', 0,
      'reason_code', 'UNEXPECTED_STATE',
      'distancia_metros', NULL,
      'atributos_divergentes', '[]'
    );
  END IF;
END;
$$;