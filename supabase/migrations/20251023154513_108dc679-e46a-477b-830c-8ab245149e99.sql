-- Adicionar coluna import_batch_id em todas as tabelas de necessidades
-- Esta coluna permite rastreamento preciso de cada importação e deleção simplificada

ALTER TABLE necessidades_placas 
ADD COLUMN import_batch_id UUID;

ALTER TABLE necessidades_porticos 
ADD COLUMN import_batch_id UUID;

ALTER TABLE necessidades_marcas_transversais 
ADD COLUMN import_batch_id UUID;

ALTER TABLE necessidades_marcas_longitudinais 
ADD COLUMN import_batch_id UUID;

ALTER TABLE necessidades_tachas 
ADD COLUMN import_batch_id UUID;

ALTER TABLE necessidades_defensas 
ADD COLUMN import_batch_id UUID;

ALTER TABLE necessidades_cilindros 
ADD COLUMN import_batch_id UUID;

-- Criar índices para performance em queries de agrupamento e deleção
CREATE INDEX idx_necessidades_placas_batch ON necessidades_placas(import_batch_id);
CREATE INDEX idx_necessidades_porticos_batch ON necessidades_porticos(import_batch_id);
CREATE INDEX idx_necessidades_marcas_transversais_batch ON necessidades_marcas_transversais(import_batch_id);
CREATE INDEX idx_necessidades_marcas_longitudinais_batch ON necessidades_marcas_longitudinais(import_batch_id);
CREATE INDEX idx_necessidades_tachas_batch ON necessidades_tachas(import_batch_id);
CREATE INDEX idx_necessidades_defensas_batch ON necessidades_defensas(import_batch_id);
CREATE INDEX idx_necessidades_cilindros_batch ON necessidades_cilindros(import_batch_id);