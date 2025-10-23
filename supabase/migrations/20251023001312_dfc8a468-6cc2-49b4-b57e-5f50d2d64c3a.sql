-- Função de matching linear por KM (fallback quando GPS não está disponível)
CREATE OR REPLACE FUNCTION public.match_linear_km(
  p_tipo text,
  p_km_ini numeric,
  p_km_fim numeric,
  p_rodovia_id uuid,
  p_atributos jsonb,
  p_servico text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_tipo text := upper(trim(p_tipo));
  v_limiar numeric;
  v_amb_low numeric := 0.20;
  v_decision text;
  v_cadastro_id uuid;
  v_match_score numeric;
  v_reason_code text;
  v_count_above_limiar int;
  v_max_frac numeric;
BEGIN
  -- Validar KM range
  IF p_km_ini IS NULL OR p_km_fim IS NULL OR p_km_fim < p_km_ini THEN
    RETURN jsonb_build_object(
      'decision', 'NO_MATCH',
      'cadastro_id', null,
      'match_score', null,
      'reason_code', 'INVALID_KM_RANGE'
    );
  END IF;

  -- Definir limiar por tipo
  v_limiar := CASE v_tipo
    WHEN 'MARCA_LONG' THEN 0.30
    WHEN 'TACHAS'     THEN 0.30
    WHEN 'DEFENSA'    THEN 0.25
    WHEN 'CILINDRO'   THEN 0.25
    ELSE 0.30
  END;

  -- Calcular overlap e ranking
  WITH cand AS (
    SELECT
      i.id,
      i.km_inicial AS b0,
      i.km_final AS b1,
      i.dados
    FROM inventario i
    WHERE i.rodovia_id = p_rodovia_id
      AND i.tipo_elemento = v_tipo
      AND i.ativo = true
  ),
  ov AS (
    SELECT
      id,
      GREATEST(0, LEAST(p_km_fim, b1) - GREATEST(p_km_ini, b0)) AS overlap_len,
      (p_km_fim - p_km_ini) AS proj_len,
      dados
    FROM cand
  ),
  ranked AS (
    SELECT
      id,
      CASE WHEN proj_len <= 0 THEN 0 ELSE overlap_len / proj_len END AS frac,
      dados
    FROM ov
  )
  SELECT
    COUNT(*) FILTER (WHERE frac >= v_limiar),
    MAX(frac),
    (SELECT id FROM ranked ORDER BY frac DESC LIMIT 1)
  INTO v_count_above_limiar, v_max_frac, v_cadastro_id
  FROM ranked;

  -- Determinar decisão
  IF v_count_above_limiar >= 2 THEN
    v_decision := 'AMBIGUOUS';
    v_reason_code := 'MULTIPLE_CANDIDATES';
  ELSIF v_count_above_limiar = 1 THEN
    v_decision := 'MATCH_DIRECT';
    v_reason_code := 'OVERLAP_ABOVE_THRESHOLD';
  ELSIF v_max_frac BETWEEN v_amb_low AND v_limiar THEN
    v_decision := 'AMBIGUOUS';
    v_reason_code := 'GRAY_ZONE';
  ELSE
    v_decision := 'NO_MATCH';
    v_reason_code := 'NO_CANDIDATE_OVERLAP';
  END IF;

  v_match_score := COALESCE(v_max_frac, 0);

  RETURN jsonb_build_object(
    'decision', v_decision,
    'cadastro_id', v_cadastro_id,
    'match_score', v_match_score,
    'reason_code', v_reason_code
  );
END;
$$;