-- Migration: Permitir NULL em coluna servico das tabelas de necessidades
-- Justificativa: Importação pura sem matching automático (Etapa 1)
-- O matching será feito posteriormente na aba dedicada (Etapa 2)

-- Alterar constraint NOT NULL para NULLABLE em todas as tabelas de necessidades
ALTER TABLE necessidades_cilindros 
  ALTER COLUMN servico DROP NOT NULL;

ALTER TABLE necessidades_defensas 
  ALTER COLUMN servico DROP NOT NULL;

ALTER TABLE necessidades_marcas_longitudinais 
  ALTER COLUMN servico DROP NOT NULL;

ALTER TABLE necessidades_marcas_transversais 
  ALTER COLUMN servico DROP NOT NULL;

ALTER TABLE necessidades_placas 
  ALTER COLUMN servico DROP NOT NULL;

ALTER TABLE necessidades_porticos 
  ALTER COLUMN servico DROP NOT NULL;

ALTER TABLE necessidades_tachas 
  ALTER COLUMN servico DROP NOT NULL;

-- Adicionar comentários explicativos
COMMENT ON COLUMN necessidades_cilindros.servico IS 
  'Tipo de serviço (Remover/Substituir/Implantar/Manter). NULL até matching na aba dedicada';

COMMENT ON COLUMN necessidades_defensas.servico IS 
  'Tipo de serviço (Remover/Substituir/Implantar/Manter). NULL até matching na aba dedicada';

COMMENT ON COLUMN necessidades_marcas_longitudinais.servico IS 
  'Tipo de serviço (Remover/Substituir/Implantar/Manter). NULL até matching na aba dedicada';

COMMENT ON COLUMN necessidades_marcas_transversais.servico IS 
  'Tipo de serviço (Remover/Substituir/Implantar/Manter). NULL até matching na aba dedicada';

COMMENT ON COLUMN necessidades_placas.servico IS 
  'Tipo de serviço (Remover/Substituir/Implantar/Manter). NULL até matching na aba dedicada';

COMMENT ON COLUMN necessidades_porticos.servico IS 
  'Tipo de serviço (Remover/Substituir/Implantar/Manter). NULL até matching na aba dedicada';

COMMENT ON COLUMN necessidades_tachas.servico IS 
  'Tipo de serviço (Remover/Substituir/Implantar/Manter). NULL até matching na aba dedicada';