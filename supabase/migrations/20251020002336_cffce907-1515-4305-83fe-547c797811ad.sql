-- Corrigir função find_orphaned_reconciliacoes para eliminar ambiguidade de coluna 'id'
CREATE OR REPLACE FUNCTION public.find_orphaned_reconciliacoes()
RETURNS TABLE(
  id uuid,
  tipo_elemento tipo_elemento_reconciliacao,
  necessidade_id uuid,
  cadastro_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
    (r.tipo_elemento = 'placas' AND NOT EXISTS (SELECT 1 FROM ficha_placa fp WHERE fp.id = r.cadastro_id))
    OR (r.tipo_elemento = 'defensas' AND NOT EXISTS (SELECT 1 FROM defensas d WHERE d.id = r.cadastro_id))
    OR (r.tipo_elemento = 'porticos' AND NOT EXISTS (SELECT 1 FROM ficha_porticos fpo WHERE fpo.id = r.cadastro_id))
    OR (r.tipo_elemento = 'marcas_longitudinais' AND NOT EXISTS (SELECT 1 FROM ficha_marcas_longitudinais fml WHERE fml.id = r.cadastro_id))
    OR (r.tipo_elemento = 'inscricoes' AND NOT EXISTS (SELECT 1 FROM ficha_inscricoes fi WHERE fi.id = r.cadastro_id))
    OR (r.tipo_elemento = 'cilindros' AND NOT EXISTS (SELECT 1 FROM ficha_cilindros fc WHERE fc.id = r.cadastro_id))
    OR (r.tipo_elemento = 'tachas' AND NOT EXISTS (SELECT 1 FROM ficha_tachas ft WHERE ft.id = r.cadastro_id))
  );
END;
$function$;