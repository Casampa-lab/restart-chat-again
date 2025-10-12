-- Corrigir função match (remover HAVING que causa erro)
DROP FUNCTION IF EXISTS public.match_cadastro_por_coordenadas(text, numeric, numeric, uuid, integer);

CREATE OR REPLACE FUNCTION public.match_cadastro_por_coordenadas(
  p_tipo text,
  p_lat numeric,
  p_long numeric,
  p_rodovia_id uuid,
  p_tolerancia_metros integer DEFAULT 50
)
RETURNS TABLE(cadastro_id uuid, distancia_metros numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tabela TEXT;
  v_lat_col TEXT;
  v_long_col TEXT;
BEGIN
  CASE p_tipo
    WHEN 'marcas_longitudinais' THEN v_tabela := 'ficha_marcas_longitudinais'; v_lat_col := 'latitude_inicial'; v_long_col := 'longitude_inicial';
    WHEN 'tachas' THEN v_tabela := 'ficha_tachas'; v_lat_col := 'latitude_inicial'; v_long_col := 'longitude_inicial';
    WHEN 'marcas_transversais' THEN v_tabela := 'ficha_inscricoes'; v_lat_col := 'latitude_inicial'; v_long_col := 'longitude_inicial';
    WHEN 'cilindros' THEN v_tabela := 'ficha_cilindros'; v_lat_col := 'latitude_inicial'; v_long_col := 'longitude_inicial';
    WHEN 'placas' THEN v_tabela := 'ficha_placa'; v_lat_col := 'latitude'; v_long_col := 'longitude';
    WHEN 'porticos' THEN v_tabela := 'ficha_porticos'; v_lat_col := 'latitude'; v_long_col := 'longitude';
    WHEN 'defensas' THEN v_tabela := 'defensas'; v_lat_col := 'latitude_inicial'; v_long_col := 'longitude_inicial';
    ELSE RAISE EXCEPTION 'Tipo inválido: %', p_tipo;
  END CASE;
  
  RETURN QUERY EXECUTE format('
    WITH distancias AS (
      SELECT 
        id,
        ROUND(6371000 * acos(LEAST(1.0, GREATEST(-1.0,
          cos(radians($1)) * cos(radians(%I)) *
          cos(radians(%I) - radians($2)) +
          sin(radians($1)) * sin(radians(%I))
        ))))::NUMERIC AS dist
      FROM %I
      WHERE rodovia_id = $3
        AND %I IS NOT NULL
        AND %I IS NOT NULL
        AND %I BETWEEN $1 - 0.01 AND $1 + 0.01
        AND %I BETWEEN $2 - 0.01 AND $2 + 0.01
    )
    SELECT id, dist FROM distancias WHERE dist <= $4 ORDER BY dist LIMIT 1
  ', v_lat_col, v_long_col, v_lat_col, v_tabela, v_lat_col, v_long_col, v_lat_col, v_long_col)
  USING p_lat, p_long, p_rodovia_id, p_tolerancia_metros;
END;
$$;