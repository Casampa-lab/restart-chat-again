-- ============================================
-- FASE 1 (continuação): Função de Match por Coordenadas
-- Usa fórmula de Haversine para calcular distância
-- ============================================

CREATE OR REPLACE FUNCTION public.match_cadastro_por_coordenadas(
  p_tipo TEXT,              -- 'marcas_longitudinais', 'placas', 'tachas', etc
  p_lat NUMERIC,
  p_long NUMERIC,
  p_rodovia_id UUID,
  p_tolerancia_metros INTEGER DEFAULT 50
) RETURNS TABLE (
  cadastro_id UUID,
  distancia_metros NUMERIC
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tabela TEXT;
  v_lat_col TEXT;
  v_long_col TEXT;
BEGIN
  -- Determinar tabela de cadastro e colunas de coordenadas
  CASE p_tipo
    WHEN 'marcas_longitudinais' THEN
      v_tabela := 'ficha_marcas_longitudinais';
      v_lat_col := 'latitude_inicial';
      v_long_col := 'longitude_inicial';
    WHEN 'tachas' THEN
      v_tabela := 'ficha_tachas';
      v_lat_col := 'latitude_inicial';
      v_long_col := 'longitude_inicial';
    WHEN 'marcas_transversais' THEN
      v_tabela := 'ficha_inscricoes';
      v_lat_col := 'latitude_inicial';
      v_long_col := 'longitude_inicial';
    WHEN 'cilindros' THEN
      v_tabela := 'ficha_cilindros';
      v_lat_col := 'latitude_inicial';
      v_long_col := 'longitude_inicial';
    WHEN 'placas' THEN
      v_tabela := 'ficha_placa';
      v_lat_col := 'latitude';
      v_long_col := 'longitude';
    WHEN 'porticos' THEN
      v_tabela := 'ficha_porticos';
      v_lat_col := 'latitude';
      v_long_col := 'longitude';
    WHEN 'defensas' THEN
      v_tabela := 'defensas';
      v_lat_col := 'latitude_inicial';
      v_long_col := 'longitude_inicial';
    ELSE
      RAISE EXCEPTION 'Tipo de cadastro inválido: %', p_tipo;
  END CASE;
  
  -- Fórmula de Haversine para calcular distância real entre coordenadas
  -- Retorna registro mais próximo dentro da tolerância
  RETURN QUERY EXECUTE format('
    SELECT 
      id AS cadastro_id,
      ROUND(
        6371000 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians($1)) * cos(radians(%I)) *
            cos(radians(%I) - radians($2)) +
            sin(radians($1)) * sin(radians(%I))
          ))
        )
      )::NUMERIC AS distancia_metros
    FROM %I
    WHERE rodovia_id = $3
      AND %I IS NOT NULL
      AND %I IS NOT NULL
      AND (
        -- Filtro preliminar por bounding box (mais rápido)
        %I BETWEEN $1 - 0.01 AND $1 + 0.01
        AND %I BETWEEN $2 - 0.01 AND $2 + 0.01
      )
    ORDER BY distancia_metros ASC
    LIMIT 1
  ', 
    v_lat_col, v_long_col, v_lat_col,  -- para fórmula Haversine
    v_tabela,                           -- FROM table
    v_lat_col, v_long_col,              -- WHERE NOT NULL
    v_lat_col, v_long_col               -- bounding box filter
  )
  USING p_lat, p_long, p_rodovia_id;
  
  -- Filtrar resultado se distância > tolerância
  IF FOUND THEN
    RETURN QUERY 
    SELECT t.cadastro_id, t.distancia_metros
    FROM (
      SELECT * FROM match_cadastro_por_coordenadas.result
    ) t
    WHERE t.distancia_metros <= p_tolerancia_metros;
  END IF;
  
  RETURN;
END;
$$;

-- Comentário explicativo
COMMENT ON FUNCTION public.match_cadastro_por_coordenadas IS 
'Busca o registro de cadastro mais próximo de uma coordenada geográfica usando a fórmula de Haversine.
Parâmetros:
- p_tipo: tipo de cadastro (marcas_longitudinais, tachas, marcas_transversais, cilindros, placas, porticos, defensas)
- p_lat: latitude do ponto a buscar
- p_long: longitude do ponto a buscar  
- p_rodovia_id: UUID da rodovia (filtro obrigatório)
- p_tolerancia_metros: distância máxima em metros para considerar match (padrão: 50m)

Retorna:
- cadastro_id: UUID do registro mais próximo (NULL se nenhum dentro da tolerância)
- distancia_metros: distância em metros até o registro encontrado';

-- Grant execute para usuários autenticados
GRANT EXECUTE ON FUNCTION public.match_cadastro_por_coordenadas TO authenticated;