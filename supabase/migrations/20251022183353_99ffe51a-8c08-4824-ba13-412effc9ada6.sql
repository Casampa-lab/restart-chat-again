-- Criar view de Inventário Dinâmico de Cilindros
-- Une cadastro original com necessidades "Implantar"
CREATE OR REPLACE VIEW inventario_dinamico_cilindros AS
-- Parte 1: Cilindros do cadastro original
SELECT 
  id,
  'CADASTRO' as origem,
  CASE 
    WHEN modificado_por_intervencao THEN 'cadastro_modificado'
    ELSE 'cadastro_inicial'
  END as tipo_origem,
  snv,
  cor_corpo,
  cor_refletivo,
  tipo_refletivo,
  km_inicial,
  km_final,
  latitude_inicial,
  longitude_inicial,
  latitude_final,
  longitude_final,
  extensao_km,
  local_implantacao,
  espacamento_m,
  quantidade,
  observacao,
  data_vistoria as data_registro,
  lote_id,
  rodovia_id,
  user_id,
  NULL as necessidade_id,
  NULL as match_decision,
  modificado_por_intervencao,
  ultima_intervencao_id,
  fotos_urls,
  ativo,
  created_at,
  updated_at
FROM ficha_cilindros

UNION ALL

-- Parte 2: Cilindros de necessidades "Implantar"
SELECT
  gen_random_uuid() as id,
  'NECESSIDADE' as origem,
  'execucao' as tipo_origem,
  snv,
  cor_corpo,
  cor_refletivo,
  tipo_refletivo,
  km_inicial,
  km_final,
  latitude_inicial,
  longitude_inicial,
  latitude_final,
  longitude_final,
  extensao_km,
  local_implantacao,
  espacamento_m,
  quantidade,
  motivo as observacao,
  NULL as data_registro,
  lote_id,
  rodovia_id,
  user_id,
  id as necessidade_id,
  match_decision,
  false as modificado_por_intervencao,
  NULL as ultima_intervencao_id,
  NULL as fotos_urls,
  true as ativo,
  created_at,
  updated_at
FROM necessidades_cilindros
WHERE servico = 'Implantar';