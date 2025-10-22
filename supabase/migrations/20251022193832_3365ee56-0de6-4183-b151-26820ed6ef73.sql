-- Etapa 1: Adicionar colunas para sistema de matching e detecção de erros

-- Adicionar colunas à tabela necessidades_cilindros
ALTER TABLE necessidades_cilindros
  ADD COLUMN IF NOT EXISTS cadastro_match_id uuid REFERENCES ficha_cilindros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS erro_projeto_detectado boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS tipo_erro_projeto text,
  ADD COLUMN IF NOT EXISTS decisao_usuario text CHECK (decisao_usuario IN ('PENDENTE_REVISAO', 'CORRIGIR_PARA_SUBSTITUIR', 'MANTER_IMPLANTAR'));

-- Comentários explicativos
COMMENT ON COLUMN necessidades_cilindros.cadastro_match_id IS 'ID do elemento no cadastro que foi matchado com esta necessidade';
COMMENT ON COLUMN necessidades_cilindros.erro_projeto_detectado IS 'TRUE se foi detectado erro de projeto (ex: Implantar quando deveria ser Substituir)';
COMMENT ON COLUMN necessidades_cilindros.tipo_erro_projeto IS 'Tipo do erro detectado (ex: IMPLANTAR_DEVERIA_SER_SUBSTITUIR)';
COMMENT ON COLUMN necessidades_cilindros.decisao_usuario IS 'Decisão do usuário sobre o erro de projeto detectado';

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_necessidades_cadastro_match 
  ON necessidades_cilindros(cadastro_match_id) 
  WHERE cadastro_match_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_necessidades_erro_projeto 
  ON necessidades_cilindros(erro_projeto_detectado) 
  WHERE erro_projeto_detectado = TRUE;

CREATE INDEX IF NOT EXISTS idx_necessidades_decisao_usuario 
  ON necessidades_cilindros(decisao_usuario) 
  WHERE decisao_usuario IS NOT NULL;

-- Migrar dados: copiar cadastro_id para cadastro_match_id se existir match
UPDATE necessidades_cilindros
SET cadastro_match_id = cadastro_id
WHERE cadastro_id IS NOT NULL 
  AND cadastro_match_id IS NULL
  AND match_decision IN ('MATCH_DIRECT', 'SUBSTITUICAO');