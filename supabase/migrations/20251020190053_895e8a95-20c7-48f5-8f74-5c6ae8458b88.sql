-- Força regeneração do schema cache adicionando comentário
COMMENT ON TABLE defensas IS 'Tabela de defensas metálicas conforme IN 3/2025. Campo tipo_defensa foi removido (não é estrutural).';

-- Garantir que a view também está atualizada (se existir)
DROP VIEW IF EXISTS v_auditoria_inventario CASCADE;

CREATE OR REPLACE VIEW v_auditoria_inventario AS
SELECT 
  'placas' as tipo_elemento,
  p.id as elemento_id,
  p.codigo,
  p.km,
  p.snv,
  NULL::text as tipo_defensa,
  p.user_id,
  p.created_at,
  p.origem,
  p.modificado_por_intervencao,
  p.data_ultima_modificacao
FROM ficha_placa p

UNION ALL

SELECT 
  'defensas' as tipo_elemento,
  d.id as elemento_id,
  d.id_defensa as codigo,
  d.km_inicial as km,
  d.snv,
  NULL::text as tipo_defensa,
  d.user_id,
  d.created_at,
  d.origem,
  d.modificado_por_intervencao,
  d.data_ultima_modificacao
FROM defensas d;