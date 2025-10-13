-- Remove campos de condição da tabela defensas (inventário)
ALTER TABLE defensas 
DROP COLUMN IF EXISTS estado_conservacao,
DROP COLUMN IF EXISTS tipo_avaria,
DROP COLUMN IF EXISTS necessita_intervencao,
DROP COLUMN IF EXISTS nivel_risco,
DROP COLUMN IF EXISTS observacao,
DROP COLUMN IF EXISTS foto_url;

-- Adicionar campos à tabela defensas_intervencoes
ALTER TABLE defensas_intervencoes
ADD COLUMN IF NOT EXISTS tipo_avaria text,
ADD COLUMN IF NOT EXISTS necessita_intervencao boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS nivel_risco text,
ADD COLUMN IF NOT EXISTS observacao text,
ADD COLUMN IF NOT EXISTS foto_url text;