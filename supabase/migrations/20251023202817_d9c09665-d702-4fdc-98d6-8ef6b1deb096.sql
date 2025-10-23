-- Criar função RPC para consolidar contagens do dashboard
CREATE OR REPLACE FUNCTION get_counts_inventario_placas(p_lote_id UUID, p_rodovia_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_placas', (SELECT COUNT(*) FROM inventario_dinamico_placas WHERE lote_id = p_lote_id AND rodovia_id = p_rodovia_id),
    'necessidades_consolidadas', (SELECT COUNT(*) FROM inventario_dinamico_placas WHERE lote_id = p_lote_id AND rodovia_id = p_rodovia_id AND origem = 'NECESSIDADE_CONSOLIDADA'),
    'necessidades_novas', (SELECT COUNT(*) FROM inventario_dinamico_placas WHERE lote_id = p_lote_id AND rodovia_id = p_rodovia_id AND origem = 'NECESSIDADE_NOVA'),
    'cadastro_original', (SELECT COUNT(*) FROM inventario_dinamico_placas WHERE lote_id = p_lote_id AND rodovia_id = p_rodovia_id AND origem = 'CADASTRO_ORIGINAL'),
    'pendentes_reconciliacao', (SELECT COUNT(*) FROM inventario_dinamico_placas WHERE lote_id = p_lote_id AND rodovia_id = p_rodovia_id AND origem = 'NECESSIDADE_PENDENTE_RECONCILIACAO')
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adicionar índices para otimizar queries (sem WHERE ativo para tabelas de necessidades)
CREATE INDEX IF NOT EXISTS idx_necessidades_placas_lote_rodovia 
ON necessidades_placas(lote_id, rodovia_id);

CREATE INDEX IF NOT EXISTS idx_ficha_placa_lote_rodovia 
ON ficha_placa(lote_id, rodovia_id) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_necessidades_placas_km 
ON necessidades_placas(km_inicial);

CREATE INDEX IF NOT EXISTS idx_ficha_placa_km 
ON ficha_placa(km_inicial) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_necessidades_placas_match 
ON necessidades_placas(match_decision, cadastro_id);