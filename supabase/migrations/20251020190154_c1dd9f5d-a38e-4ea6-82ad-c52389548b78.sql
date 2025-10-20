-- Recria a view de auditoria com todos os campos necessários
DROP VIEW IF EXISTS v_auditoria_inventario CASCADE;

CREATE OR REPLACE VIEW v_auditoria_inventario AS
-- Placas
SELECT 
  'placas' as tipo_elemento,
  p.id as elemento_id,
  p.codigo as identificador,
  p.km as localizacao_km,
  p.origem as tipo_origem_cadastro,
  p.modificado_por_intervencao,
  p.ultima_intervencao_id,
  p.data_ultima_modificacao,
  p.created_at as data_cadastro,
  CASE 
    WHEN p.modificado_por_intervencao AND p.origem = 'manutencao_pre_projeto' THEN 'manutencao_pre_projeto'
    WHEN p.modificado_por_intervencao AND p.origem = 'execucao' THEN 'execucao'
    ELSE NULL
  END as tipo_ultima_intervencao,
  NULL::text as motivo_intervencao,
  NULL::timestamp with time zone as data_intervencao,
  NULL::uuid as aprovado_por,
  NULL::timestamp with time zone as data_aprovacao_coordenador,
  NULL::text as aprovado_por_nome,
  p.rodovia_id,
  p.lote_id,
  p.user_id as cadastrado_por
FROM ficha_placa p

UNION ALL

-- Defensas
SELECT 
  'defensas' as tipo_elemento,
  d.id as elemento_id,
  d.id_defensa as identificador,
  d.km_inicial as localizacao_km,
  d.origem as tipo_origem_cadastro,
  d.modificado_por_intervencao,
  d.ultima_intervencao_id,
  d.data_ultima_modificacao,
  d.created_at as data_cadastro,
  CASE 
    WHEN d.modificado_por_intervencao AND d.origem = 'manutencao_pre_projeto' THEN 'manutencao_pre_projeto'
    WHEN d.modificado_por_intervencao AND d.origem = 'execucao' THEN 'execucao'
    ELSE NULL
  END as tipo_ultima_intervencao,
  NULL::text as motivo_intervencao,
  NULL::timestamp with time zone as data_intervencao,
  NULL::uuid as aprovado_por,
  NULL::timestamp with time zone as data_aprovacao_coordenador,
  NULL::text as aprovado_por_nome,
  d.rodovia_id,
  d.lote_id,
  d.user_id as cadastrado_por
FROM defensas d

UNION ALL

-- Marcas Longitudinais
SELECT 
  'marcas_longitudinais' as tipo_elemento,
  m.id as elemento_id,
  m.codigo as identificador,
  m.km_inicial as localizacao_km,
  m.origem as tipo_origem_cadastro,
  m.modificado_por_intervencao,
  m.ultima_intervencao_id,
  m.data_ultima_modificacao,
  m.created_at as data_cadastro,
  CASE 
    WHEN m.modificado_por_intervencao AND m.origem = 'manutencao_pre_projeto' THEN 'manutencao_pre_projeto'
    WHEN m.modificado_por_intervencao AND m.origem = 'execucao' THEN 'execucao'
    ELSE NULL
  END as tipo_ultima_intervencao,
  NULL::text as motivo_intervencao,
  NULL::timestamp with time zone as data_intervencao,
  NULL::uuid as aprovado_por,
  NULL::timestamp with time zone as data_aprovacao_coordenador,
  NULL::text as aprovado_por_nome,
  m.rodovia_id,
  m.lote_id,
  m.user_id as cadastrado_por
FROM ficha_marcas_longitudinais m

UNION ALL

-- Inscrições
SELECT 
  'inscricoes' as tipo_elemento,
  i.id as elemento_id,
  i.sigla as identificador,
  i.km_inicial as localizacao_km,
  i.origem as tipo_origem_cadastro,
  i.modificado_por_intervencao,
  i.ultima_intervencao_id,
  i.data_ultima_modificacao,
  i.created_at as data_cadastro,
  CASE 
    WHEN i.modificado_por_intervencao AND i.origem = 'manutencao_pre_projeto' THEN 'manutencao_pre_projeto'
    WHEN i.modificado_por_intervencao AND i.origem = 'execucao' THEN 'execucao'
    ELSE NULL
  END as tipo_ultima_intervencao,
  NULL::text as motivo_intervencao,
  NULL::timestamp with time zone as data_intervencao,
  NULL::uuid as aprovado_por,
  NULL::timestamp with time zone as data_aprovacao_coordenador,
  NULL::text as aprovado_por_nome,
  i.rodovia_id,
  i.lote_id,
  i.user_id as cadastrado_por
FROM ficha_inscricoes i

UNION ALL

-- Cilindros
SELECT 
  'cilindros' as tipo_elemento,
  c.id as elemento_id,
  c.id::text as identificador,
  c.km_inicial as localizacao_km,
  c.origem as tipo_origem_cadastro,
  c.modificado_por_intervencao,
  c.ultima_intervencao_id,
  c.data_ultima_modificacao,
  c.created_at as data_cadastro,
  CASE 
    WHEN c.modificado_por_intervencao AND c.origem = 'manutencao_pre_projeto' THEN 'manutencao_pre_projeto'
    WHEN c.modificado_por_intervencao AND c.origem = 'execucao' THEN 'execucao'
    ELSE NULL
  END as tipo_ultima_intervencao,
  NULL::text as motivo_intervencao,
  NULL::timestamp with time zone as data_intervencao,
  NULL::uuid as aprovado_por,
  NULL::timestamp with time zone as data_aprovacao_coordenador,
  NULL::text as aprovado_por_nome,
  c.rodovia_id,
  c.lote_id,
  c.user_id as cadastrado_por
FROM ficha_cilindros c;