-- Migration: Create match_linear function with PostGIS overlap
-- Tarefa 3: Função de Match para LINEARES (overlap)

-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry columns to necessidades tables (lineares)
ALTER TABLE necessidades_marcas_longitudinais 
  ADD COLUMN IF NOT EXISTS geom_line GEOMETRY(LINESTRING, 4326);

ALTER TABLE necessidades_tachas 
  ADD COLUMN IF NOT EXISTS geom_line GEOMETRY(LINESTRING, 4326);

ALTER TABLE necessidades_defensas 
  ADD COLUMN IF NOT EXISTS geom_line GEOMETRY(LINESTRING, 4326);

ALTER TABLE necessidades_cilindros 
  ADD COLUMN IF NOT EXISTS geom_line GEOMETRY(LINESTRING, 4326);

-- Add geometry columns to cadastro tables (lineares)
ALTER TABLE ficha_marcas_longitudinais 
  ADD COLUMN IF NOT EXISTS geom_line GEOMETRY(LINESTRING, 4326);

ALTER TABLE ficha_tachas 
  ADD COLUMN IF NOT EXISTS geom_line GEOMETRY(LINESTRING, 4326);

ALTER TABLE defensas 
  ADD COLUMN IF NOT EXISTS geom_line GEOMETRY(LINESTRING, 4326);

ALTER TABLE ficha_cilindros 
  ADD COLUMN IF NOT EXISTS geom_line GEOMETRY(LINESTRING, 4326);

-- Create spatial indexes (GIST)
CREATE INDEX IF NOT EXISTS idx_nec_ml_geom ON necessidades_marcas_longitudinais USING GIST(geom_line);
CREATE INDEX IF NOT EXISTS idx_nec_tachas_geom ON necessidades_tachas USING GIST(geom_line);
CREATE INDEX IF NOT EXISTS idx_nec_defensas_geom ON necessidades_defensas USING GIST(geom_line);
CREATE INDEX IF NOT EXISTS idx_nec_cilindros_geom ON necessidades_cilindros USING GIST(geom_line);

CREATE INDEX IF NOT EXISTS idx_ml_geom ON ficha_marcas_longitudinais USING GIST(geom_line);
CREATE INDEX IF NOT EXISTS idx_tachas_geom ON ficha_tachas USING GIST(geom_line);
CREATE INDEX IF NOT EXISTS idx_defensas_geom ON defensas USING GIST(geom_line);
CREATE INDEX IF NOT EXISTS idx_cilindros_geom ON ficha_cilindros USING GIST(geom_line);

-- Function to build LINESTRING from lat/lon inicial/final
CREATE OR REPLACE FUNCTION build_linestring(
  lat_ini NUMERIC,
  lon_ini NUMERIC,
  lat_fim NUMERIC,
  lon_fim NUMERIC
) RETURNS GEOMETRY
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF lat_ini IS NULL OR lon_ini IS NULL OR lat_fim IS NULL OR lon_fim IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN ST_MakeLine(
    ST_SetSRID(ST_MakePoint(lon_ini, lat_ini), 4326),
    ST_SetSRID(ST_MakePoint(lon_fim, lat_fim), 4326)
  );
END;
$$;

-- Triggers to auto-populate geom_line (necessidades_marcas_longitudinais)
CREATE OR REPLACE FUNCTION populate_geom_line_nec_ml()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.geom_line := build_linestring(
    NEW.latitude_inicial,
    NEW.longitude_inicial,
    NEW.latitude_final,
    NEW.longitude_final
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_populate_geom_nec_ml
  BEFORE INSERT OR UPDATE OF latitude_inicial, longitude_inicial, latitude_final, longitude_final
  ON necessidades_marcas_longitudinais
  FOR EACH ROW
  EXECUTE FUNCTION populate_geom_line_nec_ml();

-- Triggers for necessidades_tachas
CREATE OR REPLACE FUNCTION populate_geom_line_nec_tachas()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.geom_line := build_linestring(
    NEW.latitude_inicial,
    NEW.longitude_inicial,
    NEW.latitude_final,
    NEW.longitude_final
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_populate_geom_nec_tachas
  BEFORE INSERT OR UPDATE OF latitude_inicial, longitude_inicial, latitude_final, longitude_final
  ON necessidades_tachas
  FOR EACH ROW
  EXECUTE FUNCTION populate_geom_line_nec_tachas();

-- Triggers for necessidades_defensas
CREATE OR REPLACE FUNCTION populate_geom_line_nec_defensas()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.geom_line := build_linestring(
    NEW.latitude_inicial,
    NEW.longitude_inicial,
    NEW.latitude_final,
    NEW.longitude_final
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_populate_geom_nec_defensas
  BEFORE INSERT OR UPDATE OF latitude_inicial, longitude_inicial, latitude_final, longitude_final
  ON necessidades_defensas
  FOR EACH ROW
  EXECUTE FUNCTION populate_geom_line_nec_defensas();

-- Triggers for necessidades_cilindros
CREATE OR REPLACE FUNCTION populate_geom_line_nec_cilindros()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.geom_line := build_linestring(
    NEW.latitude_inicial,
    NEW.longitude_inicial,
    NEW.latitude_final,
    NEW.longitude_final
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_populate_geom_nec_cilindros
  BEFORE INSERT OR UPDATE OF latitude_inicial, longitude_inicial, latitude_final, longitude_final
  ON necessidades_cilindros
  FOR EACH ROW
  EXECUTE FUNCTION populate_geom_line_nec_cilindros();

-- Triggers for cadastro tables (ficha_marcas_longitudinais)
CREATE OR REPLACE FUNCTION populate_geom_line_ml()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.geom_line := build_linestring(
    NEW.latitude_inicial,
    NEW.longitude_inicial,
    NEW.latitude_final,
    NEW.longitude_final
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_populate_geom_ml
  BEFORE INSERT OR UPDATE OF latitude_inicial, longitude_inicial, latitude_final, longitude_final
  ON ficha_marcas_longitudinais
  FOR EACH ROW
  EXECUTE FUNCTION populate_geom_line_ml();

-- Triggers for ficha_tachas
CREATE OR REPLACE FUNCTION populate_geom_line_tachas()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.geom_line := build_linestring(
    NEW.latitude_inicial,
    NEW.longitude_inicial,
    NEW.latitude_final,
    NEW.longitude_final
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_populate_geom_tachas
  BEFORE INSERT OR UPDATE OF latitude_inicial, longitude_inicial, latitude_final, longitude_final
  ON ficha_tachas
  FOR EACH ROW
  EXECUTE FUNCTION populate_geom_line_tachas();

-- Triggers for defensas
CREATE OR REPLACE FUNCTION populate_geom_line_defensas()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.geom_line := build_linestring(
    NEW.latitude_inicial,
    NEW.longitude_inicial,
    NEW.latitude_final,
    NEW.longitude_final
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_populate_geom_defensas
  BEFORE INSERT OR UPDATE OF latitude_inicial, longitude_inicial, latitude_final, longitude_final
  ON defensas
  FOR EACH ROW
  EXECUTE FUNCTION populate_geom_line_defensas();

-- Triggers for ficha_cilindros
CREATE OR REPLACE FUNCTION populate_geom_line_cilindros()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.geom_line := build_linestring(
    NEW.latitude_inicial,
    NEW.longitude_inicial,
    NEW.latitude_final,
    NEW.longitude_final
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_populate_geom_cilindros
  BEFORE INSERT OR UPDATE OF latitude_inicial, longitude_inicial, latitude_final, longitude_final
  ON ficha_cilindros
  FOR EACH ROW
  EXECUTE FUNCTION populate_geom_line_cilindros();

-- Main function: match_linear
CREATE OR REPLACE FUNCTION match_linear(
  p_tipo tipo_elemento_enum,
  p_geom_necessidade GEOMETRY(LINESTRING, 4326),
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
  v_length_nec NUMERIC;
  v_overlap_ratio NUMERIC;
  v_atributos_req TEXT[];
  v_divergencias TEXT[] := '{}';
  v_attr TEXT;
BEGIN
  IF p_geom_necessidade IS NULL OR ST_IsEmpty(p_geom_necessidade) THEN
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
  
  v_length_nec := ST_Length(p_geom_necessidade::geography);
  
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
  USING p_geom_necessidade, p_rodovia_id, v_length_nec;
  
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
$$;

GRANT EXECUTE ON FUNCTION match_linear TO authenticated;
GRANT EXECUTE ON FUNCTION build_linestring TO authenticated;

COMMENT ON FUNCTION match_linear IS 'Match elementos lineares usando overlap de segmentos PostGIS. Usa ST_Intersects + ST_Length para calcular ratio de sobreposição';
COMMENT ON FUNCTION build_linestring IS 'Constrói LINESTRING a partir de coordenadas inicial e final';
