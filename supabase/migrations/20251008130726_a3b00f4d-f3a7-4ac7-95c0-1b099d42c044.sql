-- Adicionar colunas para medições separadas de película fundo e legenda/orla
-- na tabela retrorrefletividade_estatica conforme IN 03/2025

-- Adicionar colunas para película FUNDO
ALTER TABLE retrorrefletividade_estatica 
  ADD COLUMN IF NOT EXISTS cor_fundo TEXT,
  ADD COLUMN IF NOT EXISTS valor_medido_fundo NUMERIC,
  ADD COLUMN IF NOT EXISTS valor_minimo_fundo NUMERIC,
  ADD COLUMN IF NOT EXISTS situacao_fundo TEXT;

-- Adicionar colunas para película LEGENDA/ORLA
ALTER TABLE retrorrefletividade_estatica 
  ADD COLUMN IF NOT EXISTS cor_legenda TEXT,
  ADD COLUMN IF NOT EXISTS valor_medido_legenda NUMERIC,
  ADD COLUMN IF NOT EXISTS valor_minimo_legenda NUMERIC,
  ADD COLUMN IF NOT EXISTS situacao_legenda TEXT;

-- Comentários explicativos
COMMENT ON COLUMN retrorrefletividade_estatica.cor_fundo IS 'Cor da película de fundo da placa';
COMMENT ON COLUMN retrorrefletividade_estatica.valor_medido_fundo IS 'Média das 5 leituras da película de fundo (cd/lx/m²)';
COMMENT ON COLUMN retrorrefletividade_estatica.valor_minimo_fundo IS 'Valor mínimo aceitável para película de fundo (cd/lx/m²)';
COMMENT ON COLUMN retrorrefletividade_estatica.situacao_fundo IS 'Situação da película de fundo: Conforme ou Não Conforme';

COMMENT ON COLUMN retrorrefletividade_estatica.cor_legenda IS 'Cor da película de legenda/orla da placa';
COMMENT ON COLUMN retrorrefletividade_estatica.valor_medido_legenda IS 'Média das 5 leituras da película de legenda/orla (cd/lx/m²)';
COMMENT ON COLUMN retrorrefletividade_estatica.valor_minimo_legenda IS 'Valor mínimo aceitável para película de legenda/orla (cd/lx/m²)';
COMMENT ON COLUMN retrorrefletividade_estatica.situacao_legenda IS 'Situação da película de legenda/orla: Conforme ou Não Conforme';