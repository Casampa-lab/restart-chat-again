-- ============================================================================
-- CORREÇÃO: Popular cadastro_match_id e detectar erros de projeto
-- ============================================================================

-- PASSO 1: Popular cadastro_match_id para matches diretos e substituições
UPDATE necessidades_cilindros
SET 
  cadastro_match_id = cadastro_id,
  updated_at = now()
WHERE cadastro_id IS NOT NULL
  AND cadastro_match_id IS NULL
  AND match_decision IN ('MATCH_DIRECT', 'SUBSTITUICAO');

-- PASSO 2: Detectar erros de projeto (Implantar com match forte de Substituição)
UPDATE necessidades_cilindros
SET 
  erro_projeto_detectado = TRUE,
  tipo_erro_projeto = 'IMPLANTAR_DEVERIA_SER_SUBSTITUIR',
  decisao_usuario = 'PENDENTE_REVISAO',
  updated_at = now()
WHERE servico = 'Implantar'
  AND match_decision = 'SUBSTITUICAO'
  AND match_score >= 0.7
  AND cadastro_match_id IS NOT NULL
  AND (erro_projeto_detectado = FALSE OR erro_projeto_detectado IS NULL);

-- PASSO 3: Criar índice para otimizar queries da view
CREATE INDEX IF NOT EXISTS idx_necessidades_match_consolidado
  ON necessidades_cilindros(cadastro_match_id, match_decision)
  WHERE cadastro_match_id IS NOT NULL 
    AND match_decision IN ('MATCH_DIRECT', 'SUBSTITUICAO');

-- PASSO 4: Comentário explicativo
COMMENT ON INDEX idx_necessidades_match_consolidado IS 
  'Otimiza queries da view inventario_dinamico_cilindros para necessidades consolidadas';