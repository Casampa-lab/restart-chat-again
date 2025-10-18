-- ========================================
-- VABLE - CAMADA DE AUDITORIA E VIEWS
-- Complemento do Addendum Técnico
-- ========================================

-- 1. View consolidada de auditoria do inventário
CREATE OR REPLACE VIEW v_auditoria_inventario AS
-- Placas
SELECT 
  'placas' as tipo_elemento,
  fp.id as elemento_id,
  fp.codigo as identificador,
  fp.km as localizacao_km,
  fp.origem as tipo_origem_cadastro,
  fp.modificado_por_intervencao,
  fp.ultima_intervencao_id,
  fp.data_ultima_modificacao,
  fp.created_at as data_cadastro,
  fpi.tipo_origem as tipo_ultima_intervencao,
  fpi.motivo as motivo_intervencao,
  fpi.data_intervencao,
  fpi.coordenador_id as aprovado_por,
  fpi.data_aprovacao_coordenador,
  p.nome as aprovado_por_nome,
  fp.rodovia_id,
  fp.lote_id,
  fp.user_id as cadastrado_por
FROM ficha_placa fp
LEFT JOIN ficha_placa_intervencoes fpi ON fpi.id = fp.ultima_intervencao_id
LEFT JOIN profiles p ON p.id = fpi.coordenador_id

UNION ALL

-- Marcas Longitudinais
SELECT 
  'marcas_longitudinais' as tipo_elemento,
  fml.id as elemento_id,
  fml.tipo_demarcacao as identificador,
  fml.km_inicial as localizacao_km,
  fml.origem as tipo_origem_cadastro,
  fml.modificado_por_intervencao,
  fml.ultima_intervencao_id,
  fml.data_ultima_modificacao,
  fml.created_at as data_cadastro,
  fmli.tipo_origem as tipo_ultima_intervencao,
  fmli.motivo as motivo_intervencao,
  fmli.data_intervencao,
  fmli.coordenador_id as aprovado_por,
  fmli.data_aprovacao_coordenador,
  p.nome as aprovado_por_nome,
  fml.rodovia_id,
  fml.lote_id,
  fml.user_id as cadastrado_por
FROM ficha_marcas_longitudinais fml
LEFT JOIN ficha_marcas_longitudinais_intervencoes fmli ON fmli.id = fml.ultima_intervencao_id
LEFT JOIN profiles p ON p.id = fmli.coordenador_id

UNION ALL

-- Inscrições
SELECT 
  'inscricoes' as tipo_elemento,
  fi.id as elemento_id,
  fi.sigla as identificador,
  fi.km_inicial as localizacao_km,
  fi.origem as tipo_origem_cadastro,
  fi.modificado_por_intervencao,
  fi.ultima_intervencao_id,
  fi.data_ultima_modificacao,
  fi.created_at as data_cadastro,
  fii.tipo_origem as tipo_ultima_intervencao,
  fii.motivo as motivo_intervencao,
  fii.data_intervencao,
  fii.coordenador_id as aprovado_por,
  fii.data_aprovacao_coordenador,
  p.nome as aprovado_por_nome,
  fi.rodovia_id,
  fi.lote_id,
  fi.user_id as cadastrado_por
FROM ficha_inscricoes fi
LEFT JOIN ficha_inscricoes_intervencoes fii ON fii.id = fi.ultima_intervencao_id
LEFT JOIN profiles p ON p.id = fii.coordenador_id

UNION ALL

-- Tachas
SELECT 
  'tachas' as tipo_elemento,
  ft.id as elemento_id,
  ft.snv as identificador,
  ft.km_inicial as localizacao_km,
  ft.origem as tipo_origem_cadastro,
  ft.modificado_por_intervencao,
  ft.ultima_intervencao_id,
  ft.data_ultima_modificacao,
  ft.created_at as data_cadastro,
  fti.tipo_origem as tipo_ultima_intervencao,
  fti.motivo as motivo_intervencao,
  fti.data_intervencao,
  fti.coordenador_id as aprovado_por,
  fti.data_aprovacao_coordenador,
  p.nome as aprovado_por_nome,
  ft.rodovia_id,
  ft.lote_id,
  ft.user_id as cadastrado_por
FROM ficha_tachas ft
LEFT JOIN ficha_tachas_intervencoes fti ON fti.id = ft.ultima_intervencao_id
LEFT JOIN profiles p ON p.id = fti.coordenador_id

UNION ALL

-- Cilindros
SELECT 
  'cilindros' as tipo_elemento,
  fc.id as elemento_id,
  fc.snv as identificador,
  fc.km_inicial as localizacao_km,
  fc.origem as tipo_origem_cadastro,
  fc.modificado_por_intervencao,
  fc.ultima_intervencao_id,
  fc.data_ultima_modificacao,
  fc.created_at as data_cadastro,
  fci.tipo_origem as tipo_ultima_intervencao,
  fci.motivo as motivo_intervencao,
  fci.data_intervencao,
  fci.coordenador_id as aprovado_por,
  fci.data_aprovacao_coordenador,
  p.nome as aprovado_por_nome,
  fc.rodovia_id,
  fc.lote_id,
  fc.user_id as cadastrado_por
FROM ficha_cilindros fc
LEFT JOIN ficha_cilindros_intervencoes fci ON fci.id = fc.ultima_intervencao_id
LEFT JOIN profiles p ON p.id = fci.coordenador_id

UNION ALL

-- Pórticos
SELECT 
  'porticos' as tipo_elemento,
  fpo.id as elemento_id,
  fpo.tipo as identificador,
  fpo.km as localizacao_km,
  fpo.origem as tipo_origem_cadastro,
  fpo.modificado_por_intervencao,
  fpo.ultima_intervencao_id,
  fpo.data_ultima_modificacao,
  fpo.created_at as data_cadastro,
  fpoi.tipo_origem as tipo_ultima_intervencao,
  fpoi.motivo as motivo_intervencao,
  fpoi.data_intervencao,
  fpoi.coordenador_id as aprovado_por,
  fpoi.data_aprovacao_coordenador,
  p.nome as aprovado_por_nome,
  fpo.rodovia_id,
  fpo.lote_id,
  fpo.user_id as cadastrado_por
FROM ficha_porticos fpo
LEFT JOIN ficha_porticos_intervencoes fpoi ON fpoi.id = fpo.ultima_intervencao_id
LEFT JOIN profiles p ON p.id = fpoi.coordenador_id

UNION ALL

-- Defensas
SELECT 
  'defensas' as tipo_elemento,
  d.id as elemento_id,
  d.tipo_defensa as identificador,
  d.km_inicial as localizacao_km,
  d.origem as tipo_origem_cadastro,
  d.modificado_por_intervencao,
  d.ultima_intervencao_id,
  d.data_ultima_modificacao,
  d.created_at as data_cadastro,
  di.tipo_origem as tipo_ultima_intervencao,
  di.motivo as motivo_intervencao,
  di.data_intervencao,
  di.coordenador_id as aprovado_por,
  di.data_aprovacao_coordenador,
  p.nome as aprovado_por_nome,
  d.rodovia_id,
  d.lote_id,
  d.user_id as cadastrado_por
FROM defensas d
LEFT JOIN defensas_intervencoes di ON di.id = d.ultima_intervencao_id
LEFT JOIN profiles p ON p.id = di.coordenador_id;

-- 2. Garantir RLS na view
ALTER VIEW v_auditoria_inventario OWNER TO postgres;
GRANT SELECT ON v_auditoria_inventario TO authenticated;

-- 3. Adicionar tipo_origem ao campo origem nas tabelas de inventário (se ainda não existir como ENUM)
COMMENT ON COLUMN ficha_placa.origem IS 'Origem do cadastro: cadastro_inicial, manutencao_pre_projeto, execucao';
COMMENT ON COLUMN ficha_marcas_longitudinais.origem IS 'Origem do cadastro: cadastro_inicial, manutencao_pre_projeto, execucao';
COMMENT ON COLUMN ficha_inscricoes.origem IS 'Origem do cadastro: cadastro_inicial, manutencao_pre_projeto, execucao';
COMMENT ON COLUMN ficha_tachas.origem IS 'Origem do cadastro: cadastro_inicial, manutencao_pre_projeto, execucao';
COMMENT ON COLUMN ficha_cilindros.origem IS 'Origem do cadastro: cadastro_inicial, manutencao_pre_projeto, execucao';
COMMENT ON COLUMN ficha_porticos.origem IS 'Origem do cadastro: cadastro_inicial, manutencao_pre_projeto, execucao';
COMMENT ON COLUMN defensas.origem IS 'Origem do cadastro: cadastro_inicial, manutencao_pre_projeto, execucao';

-- 4. Função auxiliar para obter badge visual de tipo origem
CREATE OR REPLACE FUNCTION get_tipo_origem_badge(p_tipo_origem TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE p_tipo_origem
    WHEN 'execucao' THEN '🟢 Execução'
    WHEN 'manutencao_pre_projeto' THEN '🟡 Manutenção Pré-Projeto'
    ELSE '⚪ Cadastro Inicial'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Comentários na view de auditoria
COMMENT ON VIEW v_auditoria_inventario IS 'View consolidada de auditoria do inventário dinâmico VABLE - rastreia todas as alterações com origem, responsável e data';
COMMENT ON COLUMN v_auditoria_inventario.tipo_elemento IS 'Tipo do elemento: placas, marcas_longitudinais, inscricoes, tachas, cilindros, porticos, defensas';
COMMENT ON COLUMN v_auditoria_inventario.tipo_origem_cadastro IS 'Origem do cadastro inicial do elemento';
COMMENT ON COLUMN v_auditoria_inventario.tipo_ultima_intervencao IS 'Tipo da última intervenção: execucao ou manutencao_pre_projeto';
COMMENT ON COLUMN v_auditoria_inventario.modificado_por_intervencao IS 'Indica se o elemento foi modificado por uma intervenção aprovada';