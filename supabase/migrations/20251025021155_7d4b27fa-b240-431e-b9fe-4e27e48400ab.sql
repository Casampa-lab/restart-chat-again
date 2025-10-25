-- Adicionar km_inicial na tabela de retrorrefletividade estática
ALTER TABLE retrorrefletividade_estatica 
ADD COLUMN IF NOT EXISTS km_inicial numeric;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_retrorrefletividade_estatica_km_inicial 
ON retrorrefletividade_estatica(km_inicial);

-- Comentário explicativo
COMMENT ON COLUMN retrorrefletividade_estatica.km_inicial 
IS 'Quilometragem inicial (mesmo padrão usado em ficha_placa)';