-- Corrigir inconsistências existentes: registros com divergencia=true E reconciliado=true
-- Esses registros são órfãos que não devem existir

UPDATE necessidades_placas 
SET divergencia = false 
WHERE divergencia = true AND reconciliado = true;

UPDATE necessidades_defensas 
SET divergencia = false 
WHERE divergencia = true AND reconciliado = true;

UPDATE necessidades_porticos 
SET divergencia = false 
WHERE divergencia = true AND reconciliado = true;

UPDATE necessidades_marcas_longitudinais 
SET divergencia = false 
WHERE divergencia = true AND reconciliado = true;

UPDATE necessidades_tachas 
SET divergencia = false 
WHERE divergencia = true AND reconciliado = true;

UPDATE necessidades_cilindros 
SET divergencia = false 
WHERE divergencia = true AND reconciliado = true;

UPDATE necessidades_marcas_transversais 
SET divergencia = false 
WHERE divergencia = true AND reconciliado = true;

-- Adicionar CHECK constraints para prevenir inconsistências futuras
-- Não é possível ter divergencia=true e reconciliado=true simultaneamente

ALTER TABLE necessidades_placas 
ADD CONSTRAINT check_divergencia_reconciliado_placas
CHECK (NOT (divergencia = true AND reconciliado = true));

ALTER TABLE necessidades_defensas 
ADD CONSTRAINT check_divergencia_reconciliado_defensas
CHECK (NOT (divergencia = true AND reconciliado = true));

ALTER TABLE necessidades_porticos 
ADD CONSTRAINT check_divergencia_reconciliado_porticos
CHECK (NOT (divergencia = true AND reconciliado = true));

ALTER TABLE necessidades_marcas_longitudinais 
ADD CONSTRAINT check_divergencia_reconciliado_marcas_long
CHECK (NOT (divergencia = true AND reconciliado = true));

ALTER TABLE necessidades_tachas 
ADD CONSTRAINT check_divergencia_reconciliado_tachas
CHECK (NOT (divergencia = true AND reconciliado = true));

ALTER TABLE necessidades_cilindros 
ADD CONSTRAINT check_divergencia_reconciliado_cilindros
CHECK (NOT (divergencia = true AND reconciliado = true));

ALTER TABLE necessidades_marcas_transversais 
ADD CONSTRAINT check_divergencia_reconciliado_marcas_trans
CHECK (NOT (divergencia = true AND reconciliado = true));