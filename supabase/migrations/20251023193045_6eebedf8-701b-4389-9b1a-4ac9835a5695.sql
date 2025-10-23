-- Corrigir view inventario_dinamico_placas para usar cadastro_id em vez de cadastro_match_id
CREATE OR REPLACE VIEW public.inventario_dinamico_placas AS
/* ============================
   PARTE 1: NECESSIDADES COM MATCH (inclui AMBIGUOUS)
   ============================ */
SELECT
  n.id, 
  CASE 
    WHEN n.match_decision = 'AMBIGUOUS' THEN 'NECESSIDADE_PENDENTE_RECONCILIACAO'
    ELSE 'NECESSIDADE_CONSOLIDADA'
  END as origem,
  CASE 
    WHEN n.match_decision = 'AMBIGUOUS' THEN 'MATCH_AMBIGUO'
    WHEN n.match_decision = 'SUBSTITUICAO' THEN 'MATCH_SUBSTITUICAO'
    ELSE 'MATCH_CONFIRMADO'
  END as tipo_origem,

  -- campos técnicos padronizados
  n.snv,
  n.codigo,
  n.lado,
  n.km_inicial,
  n.latitude_inicial,
  n.longitude_inicial,
  n.tipo,
  n.suporte as tipo_suporte,
  n.dimensoes_mm,
  n.substrato,

  -- campos de película (null para necessidades)
  NULL::text as tipo_pelicula_fundo,
  NULL::text as cor_pelicula_fundo,
  NULL::text as tipo_pelicula_legenda_orla,
  NULL::text as cor_pelicula_legenda_orla,

  n.observacao,

  n.created_at as data_registro,
  n.lote_id,
  n.rodovia_id,
  n.user_id,

  -- vinculação de matching (CORRIGIDO: usar cadastro_id)
  n.id as necessidade_id,
  n.cadastro_id as cadastro_match_id,
  n.match_decision,
  n.match_score,

  -- operação
  false as modificado_por_intervencao,
  NULL::uuid as ultima_intervencao_id,
  NULL::text[] as fotos_urls,
  true as ativo,
  n.created_at,
  n.updated_at

FROM public.necessidades_placas n
WHERE n.cadastro_id IS NOT NULL
  AND n.match_decision IN ('MATCH_DIRECT', 'SUBSTITUICAO', 'AMBIGUOUS')

UNION ALL

/* ============================
   PARTE 2: NECESSIDADES NOVAS (Implantar sem match)
   ============================ */
SELECT
  n.id,
  'NECESSIDADE_NOVA' as origem,
  'INTERVENCAO_PLANEJADA' as tipo_origem,

  n.snv,
  n.codigo,
  n.lado,
  n.km_inicial,
  n.latitude_inicial,
  n.longitude_inicial,
  n.tipo,
  n.suporte as tipo_suporte,
  n.dimensoes_mm,
  n.substrato,

  NULL::text,
  NULL::text,
  NULL::text,
  NULL::text,

  n.observacao,

  n.created_at,
  n.lote_id,
  n.rodovia_id,
  n.user_id,

  n.id,
  n.cadastro_id,
  n.match_decision,
  n.match_score,

  false,
  NULL::uuid,
  NULL::text[],
  true,
  n.created_at,
  n.updated_at

FROM public.necessidades_placas n
WHERE UPPER(n.servico) IN ('IMPLANTACAO', 'IMPLANTAÇÃO', 'IMPLANTAR')
  AND n.cadastro_id IS NULL

UNION ALL

/* ============================
   PARTE 3: CADASTRO ORIGINAL (exclui se houver match OU ambiguous)
   ============================ */
SELECT
  c.id,
  'CADASTRO_ORIGINAL' as origem,
  'LEVANTAMENTO_INICIAL' as tipo_origem,

  c.snv,
  c.codigo,
  c.lado,
  c.km_inicial,
  c.latitude_inicial,
  c.longitude_inicial,
  c.tipo,
  c.tipo_secao_suporte as tipo_suporte,
  c.dimensoes_mm,
  c.substrato,

  c.tipo_pelicula_fundo,
  c.cor_pelicula_fundo,
  c.tipo_pelicula_legenda_orla,
  c.cor_pelicula_legenda_orla,

  c.descricao,

  c.data_vistoria as data_registro,
  c.lote_id,
  c.rodovia_id,
  c.user_id,

  NULL::uuid,
  NULL::uuid,
  NULL::match_decision_enum,
  NULL::numeric,

  c.modificado_por_intervencao,
  c.ultima_intervencao_id,
  c.fotos_urls,
  c.ativo,
  c.created_at,
  c.updated_at

FROM public.ficha_placa c
WHERE c.ativo = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.necessidades_placas n
    WHERE n.cadastro_id = c.id
      AND n.match_decision IN ('MATCH_DIRECT', 'SUBSTITUICAO', 'AMBIGUOUS')
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_nec_placas_cadastro_match 
ON public.necessidades_placas(cadastro_id, match_decision);

CREATE INDEX IF NOT EXISTS idx_ficha_placa_ativo 
ON public.ficha_placa(ativo) 
WHERE ativo = TRUE;