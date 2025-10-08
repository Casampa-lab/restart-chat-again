-- Adicionar campos para suportar Sinalização Horizontal na tabela retrorrefletividade_estatica
ALTER TABLE retrorrefletividade_estatica
ADD COLUMN IF NOT EXISTS tipo_sinalizacao text,
ADD COLUMN IF NOT EXISTS valor_medido_horizontal numeric,
ADD COLUMN IF NOT EXISTS valor_minimo_horizontal numeric,
ADD COLUMN IF NOT EXISTS situacao_horizontal text;

-- Tornar campos específicos de vertical opcionais
ALTER TABLE retrorrefletividade_estatica
ALTER COLUMN lado DROP NOT NULL,
ALTER COLUMN tipo_dispositivo DROP NOT NULL,
ALTER COLUMN valor_medido_fundo DROP NOT NULL,
ALTER COLUMN valor_minimo_fundo DROP NOT NULL,
ALTER COLUMN valor_medido_legenda DROP NOT NULL,
ALTER COLUMN valor_minimo_legenda DROP NOT NULL;