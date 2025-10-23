-- Recriar view inventario_dinamico_placas com JOIN para expor campos de película
DROP VIEW IF EXISTS inventario_dinamico_placas CASCADE;

CREATE OR REPLACE VIEW inventario_dinamico_placas AS

-- SEÇÃO 1: Necessidades Consolidadas (com match) - JOIN com ficha_placa para pegar campos detalhados
SELECT 
  n.id,
  CASE
    WHEN n.match_decision = 'AMBIGUOUS' THEN 'NECESSIDADE_PENDENTE_RECONCILIACAO'
    ELSE 'NECESSIDADE_CONSOLIDADA'
  END AS origem,
  CASE
    WHEN n.match_decision = 'AMBIGUOUS' THEN 'MATCH_AMBIGUO'
    WHEN n.match_decision = 'SUBSTITUICAO' THEN 'MATCH_SUBSTITUICAO'
    ELSE 'MATCH_CONFIRMADO'
  END AS tipo_origem,
  n.snv,
  n.codigo,
  n.lado,
  n.km_inicial,
  n.latitude_inicial,
  n.longitude_inicial,
  n.tipo,
  n.suporte AS tipo_suporte,
  n.dimensoes_mm,
  n.substrato,
  c.tipo_pelicula_fundo,
  c.cor_pelicula_fundo,
  c.tipo_pelicula_legenda_orla,
  c.cor_pelicula_legenda_orla,
  c.solucao_planilha,
  c.status_servico,
  n.observacao,
  n.created_at AS data_registro,
  n.lote_id,
  n.rodovia_id,
  n.user_id,
  n.id AS necessidade_id,
  n.cadastro_id AS cadastro_match_id,
  n.match_decision,
  n.match_score,
  n.distancia_match_metros,
  FALSE AS modificado_por_intervencao,
  NULL::uuid AS ultima_intervencao_id,
  NULL::text[] AS fotos_urls,
  TRUE AS ativo,
  n.created_at,
  n.updated_at
FROM necessidades_placas n
LEFT JOIN ficha_placa c ON n.cadastro_id = c.id
WHERE n.cadastro_id IS NOT NULL
  AND n.match_decision IN ('MATCH_DIRECT', 'SUBSTITUICAO', 'AMBIGUOUS')

UNION ALL

-- SEÇÃO 2: Necessidades Novas (sem match)
SELECT 
  n.id,
  'NECESSIDADE_NOVA' AS origem,
  'INTERVENCAO_PLANEJADA' AS tipo_origem,
  n.snv,
  n.codigo,
  n.lado,
  n.km_inicial,
  n.latitude_inicial,
  n.longitude_inicial,
  n.tipo,
  n.suporte AS tipo_suporte,
  n.dimensoes_mm,
  n.substrato,
  NULL::text AS tipo_pelicula_fundo,
  NULL::text AS cor_pelicula_fundo,
  NULL::text AS tipo_pelicula_legenda_orla,
  NULL::text AS cor_pelicula_legenda_orla,
  n.solucao_planilha,
  NULL::text AS status_servico,
  n.observacao,
  n.created_at AS data_registro,
  n.lote_id,
  n.rodovia_id,
  n.user_id,
  n.id AS necessidade_id,
  n.cadastro_id AS cadastro_match_id,
  n.match_decision,
  n.match_score,
  n.distancia_match_metros,
  FALSE AS modificado_por_intervencao,
  NULL::uuid AS ultima_intervencao_id,
  NULL::text[] AS fotos_urls,
  TRUE AS ativo,
  n.created_at,
  n.updated_at
FROM necessidades_placas n
WHERE (UPPER(COALESCE(n.servico, '')) IN ('IMPLANTACAO', 'IMPLANTAÇÃO', 'IMPLANTAR'))
   OR n.match_decision = 'NO_MATCH'
   OR (n.cadastro_id IS NULL AND n.match_decision IS NULL)

UNION ALL

-- SEÇÃO 3: Cadastro Original
SELECT 
  c.id,
  'CADASTRO_ORIGINAL' AS origem,
  'LEVANTAMENTO_INICIAL' AS tipo_origem,
  c.snv,
  c.codigo,
  c.lado,
  c.km_inicial,
  c.latitude_inicial,
  c.longitude_inicial,
  c.tipo,
  c.tipo_secao_suporte AS tipo_suporte,
  c.dimensoes_mm,
  c.substrato,
  c.tipo_pelicula_fundo,
  c.cor_pelicula_fundo,
  c.tipo_pelicula_legenda_orla,
  c.cor_pelicula_legenda_orla,
  c.solucao_planilha,
  c.status_servico,
  c.descricao AS observacao,
  c.data_vistoria AS data_registro,
  c.lote_id,
  c.rodovia_id,
  c.user_id,
  NULL::uuid AS necessidade_id,
  NULL::uuid AS cadastro_match_id,
  NULL::match_decision_enum AS match_decision,
  NULL::numeric AS match_score,
  NULL::numeric AS distancia_match_metros,
  c.modificado_por_intervencao,
  c.ultima_intervencao_id,
  c.fotos_urls,
  c.ativo,
  c.created_at,
  c.updated_at
FROM ficha_placa c
WHERE c.ativo = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM necessidades_placas n
    WHERE n.cadastro_id = c.id
      AND n.match_decision IN ('MATCH_DIRECT', 'SUBSTITUICAO', 'AMBIGUOUS')
  );