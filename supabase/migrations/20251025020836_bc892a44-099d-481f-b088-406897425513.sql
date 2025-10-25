-- Adicionar km_inicial na tabela de intervenções
ALTER TABLE ficha_placa_intervencoes 
ADD COLUMN IF NOT EXISTS km_inicial numeric;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_ficha_placa_intervencoes_km_inicial 
ON ficha_placa_intervencoes(km_inicial);

-- Comentário explicativo
COMMENT ON COLUMN ficha_placa_intervencoes.km_inicial 
IS 'Quilometragem inicial da placa (mesmo padrão usado em ficha_placa)';