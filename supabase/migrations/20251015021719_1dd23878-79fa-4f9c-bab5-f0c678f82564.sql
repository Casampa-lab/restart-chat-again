-- Função para buscar rodovias que possuem necessidades em um lote específico
CREATE OR REPLACE FUNCTION get_rodovias_by_lote(p_lote_id uuid)
RETURNS TABLE (id uuid, codigo text) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT r.id, r.codigo
  FROM rodovias r
  WHERE r.id IN (
    SELECT DISTINCT rodovia_id FROM necessidades_cilindros WHERE lote_id = p_lote_id
    UNION
    SELECT DISTINCT rodovia_id FROM necessidades_defensas WHERE lote_id = p_lote_id
    UNION
    SELECT DISTINCT rodovia_id FROM necessidades_marcas_longitudinais WHERE lote_id = p_lote_id
    UNION
    SELECT DISTINCT rodovia_id FROM necessidades_porticos WHERE lote_id = p_lote_id
    UNION
    SELECT DISTINCT rodovia_id FROM necessidades_placas WHERE lote_id = p_lote_id
    UNION
    SELECT DISTINCT rodovia_id FROM necessidades_tachas WHERE lote_id = p_lote_id
    UNION
    SELECT DISTINCT rodovia_id FROM necessidades_marcas_transversais WHERE lote_id = p_lote_id
  )
  ORDER BY r.codigo;
END;
$$ LANGUAGE plpgsql;