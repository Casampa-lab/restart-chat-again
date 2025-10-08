-- Tornar colunas antigas opcionais para compatibilidade com novo sistema
-- de medição separada por cor de película conforme IN 03/2025

-- Remover constraint NOT NULL das colunas antigas
ALTER TABLE retrorrefletividade_estatica 
  ALTER COLUMN valor_medido DROP NOT NULL,
  ALTER COLUMN valor_minimo DROP NOT NULL;

-- Adicionar comentários explicando que estas colunas são legadas
COMMENT ON COLUMN retrorrefletividade_estatica.valor_medido IS 'LEGADO: Valor médio único (antes da IN 03/2025). Use valor_medido_fundo e valor_medido_legenda';
COMMENT ON COLUMN retrorrefletividade_estatica.valor_minimo IS 'LEGADO: Valor mínimo único (antes da IN 03/2025). Use valor_minimo_fundo e valor_minimo_legenda';