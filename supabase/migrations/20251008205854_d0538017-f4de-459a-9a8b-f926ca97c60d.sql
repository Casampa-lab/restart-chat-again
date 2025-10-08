-- Adicionar campos faltantes à tabela nao_conformidades para o relatório completo
ALTER TABLE nao_conformidades 
ADD COLUMN IF NOT EXISTS grau TEXT CHECK (grau IN ('Leve', 'Média', 'Grave', 'Gravíssima')),
ADD COLUMN IF NOT EXISTS natureza TEXT,
ADD COLUMN IF NOT EXISTS tipo_obra TEXT CHECK (tipo_obra IN ('Execução', 'Manutenção')),
ADD COLUMN IF NOT EXISTS comentarios_supervisora TEXT,
ADD COLUMN IF NOT EXISTS comentarios_executora TEXT,
ADD COLUMN IF NOT EXISTS contrato_supervisora TEXT;

-- Comentários para documentação
COMMENT ON COLUMN nao_conformidades.grau IS 'Grau da não conformidade: Leve, Média, Grave ou Gravíssima';
COMMENT ON COLUMN nao_conformidades.natureza IS 'Natureza da NC: S.H. (Sinalização Horizontal), S.V. (Sinalização Vertical), D.S. (Dispositivos de Segurança), etc';
COMMENT ON COLUMN nao_conformidades.tipo_obra IS 'Tipo de obra: Execução ou Manutenção';
COMMENT ON COLUMN nao_conformidades.comentarios_supervisora IS 'Comentários da empresa supervisora sobre a NC';
COMMENT ON COLUMN nao_conformidades.comentarios_executora IS 'Comentários da empresa executora sobre a NC';
COMMENT ON COLUMN nao_conformidades.contrato_supervisora IS 'Número do contrato da supervisora';