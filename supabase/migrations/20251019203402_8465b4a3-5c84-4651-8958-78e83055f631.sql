-- Criar view para inventário consolidado após Marco Zero
CREATE OR REPLACE VIEW vw_inventario_consolidado AS
SELECT 
  m.id as marco_id,
  m.lote_id,
  m.rodovia_id,
  m.data_marco,
  m.criado_por,
  
  -- Contagens diretas das tabelas (estado real atual)
  (SELECT COUNT(*) FROM ficha_placa WHERE lote_id = m.lote_id AND rodovia_id = m.rodovia_id) as total_placas,
  (SELECT COUNT(*) FROM defensas WHERE lote_id = m.lote_id AND rodovia_id = m.rodovia_id) as total_defensas,
  (SELECT COUNT(*) FROM ficha_marcas_longitudinais WHERE lote_id = m.lote_id AND rodovia_id = m.rodovia_id) as total_marcas_longitudinais,
  (SELECT COUNT(*) FROM ficha_tachas WHERE lote_id = m.lote_id AND rodovia_id = m.rodovia_id) as total_tachas,
  (SELECT COUNT(*) FROM ficha_cilindros WHERE lote_id = m.lote_id AND rodovia_id = m.rodovia_id) as total_cilindros,
  (SELECT COUNT(*) FROM ficha_porticos WHERE lote_id = m.lote_id AND rodovia_id = m.rodovia_id) as total_porticos,
  (SELECT COUNT(*) FROM ficha_inscricoes WHERE lote_id = m.lote_id AND rodovia_id = m.rodovia_id) as total_inscricoes,
  
  -- Total geral consolidado (soma de todos os elementos)
  (
    (SELECT COUNT(*) FROM ficha_placa WHERE lote_id = m.lote_id AND rodovia_id = m.rodovia_id) +
    (SELECT COUNT(*) FROM defensas WHERE lote_id = m.lote_id AND rodovia_id = m.rodovia_id) +
    (SELECT COUNT(*) FROM ficha_marcas_longitudinais WHERE lote_id = m.lote_id AND rodovia_id = m.rodovia_id) +
    (SELECT COUNT(*) FROM ficha_tachas WHERE lote_id = m.lote_id AND rodovia_id = m.rodovia_id) +
    (SELECT COUNT(*) FROM ficha_cilindros WHERE lote_id = m.lote_id AND rodovia_id = m.rodovia_id) +
    (SELECT COUNT(*) FROM ficha_porticos WHERE lote_id = m.lote_id AND rodovia_id = m.rodovia_id) +
    (SELECT COUNT(*) FROM ficha_inscricoes WHERE lote_id = m.lote_id AND rodovia_id = m.rodovia_id)
  ) as total_geral
  
FROM marcos_inventario m
WHERE m.tipo = 'marco_zero';