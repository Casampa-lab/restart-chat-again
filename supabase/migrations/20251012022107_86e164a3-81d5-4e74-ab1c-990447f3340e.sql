-- Adicionar coluna solucao_planilha nas tabelas de necessidades

ALTER TABLE necessidades_placas 
ADD COLUMN IF NOT EXISTS solucao_planilha TEXT;

ALTER TABLE necessidades_marcas_longitudinais 
ADD COLUMN IF NOT EXISTS solucao_planilha TEXT;

ALTER TABLE necessidades_tachas 
ADD COLUMN IF NOT EXISTS solucao_planilha TEXT;

ALTER TABLE necessidades_marcas_transversais 
ADD COLUMN IF NOT EXISTS solucao_planilha TEXT;

ALTER TABLE necessidades_cilindros 
ADD COLUMN IF NOT EXISTS solucao_planilha TEXT;

ALTER TABLE necessidades_porticos 
ADD COLUMN IF NOT EXISTS solucao_planilha TEXT;

ALTER TABLE necessidades_defensas 
ADD COLUMN IF NOT EXISTS solucao_planilha TEXT;