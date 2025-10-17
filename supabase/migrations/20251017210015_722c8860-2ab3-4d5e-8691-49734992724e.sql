-- Criar função RPC para encontrar reconciliações órfãs
CREATE OR REPLACE FUNCTION find_orphaned_reconciliacoes()
RETURNS TABLE(
  id UUID,
  tipo_elemento tipo_elemento_reconciliacao,
  necessidade_id UUID,
  cadastro_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.tipo_elemento,
    r.necessidade_id,
    r.cadastro_id
  FROM reconciliacoes r
  WHERE r.cadastro_id IS NOT NULL
  AND (
    (r.tipo_elemento = 'placas' AND NOT EXISTS (SELECT 1 FROM ficha_placa WHERE id = r.cadastro_id))
    OR (r.tipo_elemento = 'defensas' AND NOT EXISTS (SELECT 1 FROM defensas WHERE id = r.cadastro_id))
    OR (r.tipo_elemento = 'porticos' AND NOT EXISTS (SELECT 1 FROM ficha_porticos WHERE id = r.cadastro_id))
    OR (r.tipo_elemento = 'marcas_longitudinais' AND NOT EXISTS (SELECT 1 FROM ficha_marcas_longitudinais WHERE id = r.cadastro_id))
    OR (r.tipo_elemento = 'inscricoes' AND NOT EXISTS (SELECT 1 FROM ficha_inscricoes WHERE id = r.cadastro_id))
    OR (r.tipo_elemento = 'cilindros' AND NOT EXISTS (SELECT 1 FROM ficha_cilindros WHERE id = r.cadastro_id))
    OR (r.tipo_elemento = 'tachas' AND NOT EXISTS (SELECT 1 FROM ficha_tachas WHERE id = r.cadastro_id))
  );
END;
$$;