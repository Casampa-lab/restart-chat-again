-- Etapa 2: Recriar view do Inventário Dinâmico de Cilindros

-- Drop da view antiga
DROP VIEW IF EXISTS inventario_dinamico_cilindros CASCADE;

-- Criar nova view do Inventário Dinâmico de Cilindros
CREATE VIEW inventario_dinamico_cilindros AS

-- PARTE 1: Necessidades CONSOLIDADAS (match confirmado)
SELECT 
  n.id,
  'NECESSIDADE_CONSOLIDADA' as origem,
  'MATCH_CONFIRMADO' as tipo_origem,
  n.snv,
  n.cor_corpo,
  n.cor_refletivo,
  n.tipo_refletivo,
  n.km_inicial,
  n.km_final,
  n.latitude_inicial,
  n.longitude_inicial,
  n.latitude_final,
  n.longitude_final,
  n.extensao_km,
  n.local_implantacao,
  n.espacamento_m,
  n.quantidade,
  n.motivo as observacao,
  n.created_at as data_registro,
  n.lote_id,
  n.rodovia_id,
  n.user_id,
  n.id as necessidade_id,
  n.cadastro_match_id,
  n.match_decision,
  n.match_score,
  n.reason_code,
  n.erro_projeto_detectado,
  n.tipo_erro_projeto,
  n.decisao_usuario,
  n.distancia_match_metros,
  false as modificado_por_intervencao,
  NULL::uuid as ultima_intervencao_id,
  NULL::timestamp with time zone as data_ultima_modificacao,
  true as ativo,
  NULL::uuid as substituido_por,
  NULL::timestamp with time zone as substituido_em
FROM necessidades_cilindros n
WHERE (
  (n.match_decision IN ('MATCH_DIRECT', 'SUBSTITUICAO') AND n.cadastro_match_id IS NOT NULL)
  OR (n.decisao_usuario = 'CORRIGIR_PARA_SUBSTITUIR' AND n.cadastro_match_id IS NOT NULL)
)

UNION ALL

-- PARTE 2: Necessidades COM ERRO DE PROJETO (pendente)
SELECT 
  n.id,
  'NECESSIDADE_COM_ERRO' as origem,
  'ERRO_PROJETO_PENDENTE' as tipo_origem,
  n.snv,
  n.cor_corpo,
  n.cor_refletivo,
  n.tipo_refletivo,
  n.km_inicial,
  n.km_final,
  n.latitude_inicial,
  n.longitude_inicial,
  n.latitude_final,
  n.longitude_final,
  n.extensao_km,
  n.local_implantacao,
  n.espacamento_m,
  n.quantidade,
  n.motivo as observacao,
  n.created_at as data_registro,
  n.lote_id,
  n.rodovia_id,
  n.user_id,
  n.id as necessidade_id,
  n.cadastro_match_id,
  n.match_decision,
  n.match_score,
  n.reason_code,
  n.erro_projeto_detectado,
  n.tipo_erro_projeto,
  n.decisao_usuario,
  n.distancia_match_metros,
  false as modificado_por_intervencao,
  NULL::uuid as ultima_intervencao_id,
  NULL::timestamp with time zone as data_ultima_modificacao,
  true as ativo,
  NULL::uuid as substituido_por,
  NULL::timestamp with time zone as substituido_em
FROM necessidades_cilindros n
WHERE n.erro_projeto_detectado = TRUE
  AND n.decisao_usuario = 'PENDENTE_REVISAO'
  AND n.cadastro_match_id IS NOT NULL

UNION ALL

-- PARTE 3: Cadastros NÃO substituídos
SELECT 
  c.id,
  'CADASTRO_ORIGINAL' as origem,
  'LEVANTAMENTO_INICIAL' as tipo_origem,
  c.snv,
  c.cor_corpo,
  c.cor_refletivo,
  c.tipo_refletivo,
  c.km_inicial,
  c.km_final,
  c.latitude_inicial,
  c.longitude_inicial,
  c.latitude_final,
  c.longitude_final,
  c.extensao_km,
  c.local_implantacao,
  c.espacamento_m,
  c.quantidade,
  c.observacao,
  c.data_vistoria as data_registro,
  c.lote_id,
  c.rodovia_id,
  c.user_id,
  NULL::uuid as necessidade_id,
  NULL::uuid as cadastro_match_id,
  NULL::match_decision_enum as match_decision,
  NULL::numeric as match_score,
  NULL::text as reason_code,
  NULL::boolean as erro_projeto_detectado,
  NULL::text as tipo_erro_projeto,
  NULL::text as decisao_usuario,
  NULL::numeric as distancia_match_metros,
  c.modificado_por_intervencao,
  c.ultima_intervencao_id,
  c.data_ultima_modificacao,
  c.ativo,
  c.substituido_por,
  c.substituido_em
FROM ficha_cilindros c
WHERE c.ativo = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM necessidades_cilindros n
    WHERE n.cadastro_match_id = c.id
      AND (
        n.match_decision IN ('MATCH_DIRECT', 'SUBSTITUICAO')
        OR n.decisao_usuario IN ('CORRIGIR_PARA_SUBSTITUIR', 'PENDENTE_REVISAO')
      )
  )

UNION ALL

-- PARTE 4: Necessidades NOVAS (Implantar legítimo)
SELECT
  n.id,
  'NECESSIDADE_NOVA' as origem,
  'INTERVENCAO_PLANEJADA' as tipo_origem,
  n.snv,
  n.cor_corpo,
  n.cor_refletivo,
  n.tipo_refletivo,
  n.km_inicial,
  n.km_final,
  n.latitude_inicial,
  n.longitude_inicial,
  n.latitude_final,
  n.longitude_final,
  n.extensao_km,
  n.local_implantacao,
  n.espacamento_m,
  n.quantidade,
  n.motivo as observacao,
  n.created_at as data_registro,
  n.lote_id,
  n.rodovia_id,
  n.user_id,
  n.id as necessidade_id,
  NULL::uuid as cadastro_match_id,
  n.match_decision,
  n.match_score,
  n.reason_code,
  false as erro_projeto_detectado,
  NULL::text as tipo_erro_projeto,
  NULL::text as decisao_usuario,
  NULL::numeric as distancia_match_metros,
  false as modificado_por_intervencao,
  NULL::uuid as ultima_intervencao_id,
  NULL::timestamp with time zone as data_ultima_modificacao,
  true as ativo,
  NULL::uuid as substituido_por,
  NULL::timestamp with time zone as substituido_em
FROM necessidades_cilindros n
WHERE n.servico = 'Implantar'
  AND (n.erro_projeto_detectado = FALSE OR n.erro_projeto_detectado IS NULL)
  AND n.cadastro_match_id IS NULL;

-- Comentário na view
COMMENT ON VIEW inventario_dinamico_cilindros IS 'Inventário dinâmico consolidado: cadastro original + necessidades executadas/planejadas';