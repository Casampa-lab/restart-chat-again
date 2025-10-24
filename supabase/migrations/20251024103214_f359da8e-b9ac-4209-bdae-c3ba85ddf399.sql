-- Função que retorna vínculos lote-rodovia (segmentos) com seus KMs
CREATE OR REPLACE FUNCTION get_segmentos_rodovias_by_lote(p_lote_id uuid)
RETURNS TABLE (
  id uuid,              -- ID do vínculo (lotes_rodovias.id)
  rodovia_id uuid,      -- ID da rodovia
  codigo text,          -- Código da rodovia (BR-116)
  km_inicial numeric,
  km_final numeric,
  extensao_km numeric
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lr.id,
    lr.rodovia_id,
    r.codigo,
    lr.km_inicial,
    lr.km_final,
    lr.extensao_km
  FROM lotes_rodovias lr
  INNER JOIN rodovias r ON r.id = lr.rodovia_id
  WHERE lr.lote_id = p_lote_id
  ORDER BY r.codigo, lr.km_inicial;
END;
$$ LANGUAGE plpgsql;