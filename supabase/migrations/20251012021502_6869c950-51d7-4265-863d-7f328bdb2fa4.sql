-- Atualizar constraint de servico nas tabelas de necessidades para aceitar os novos termos

-- Remover constraints antigos e adicionar novos
ALTER TABLE necessidades_placas DROP CONSTRAINT IF EXISTS necessidades_placas_servico_check;
ALTER TABLE necessidades_placas ADD CONSTRAINT necessidades_placas_servico_check 
  CHECK (servico IN ('Implantar', 'Substituir', 'Remover', 'Manter'));

ALTER TABLE necessidades_marcas_longitudinais DROP CONSTRAINT IF EXISTS necessidades_marcas_longitudinais_servico_check;
ALTER TABLE necessidades_marcas_longitudinais ADD CONSTRAINT necessidades_marcas_longitudinais_servico_check 
  CHECK (servico IN ('Implantar', 'Substituir', 'Remover', 'Manter'));

ALTER TABLE necessidades_tachas DROP CONSTRAINT IF EXISTS necessidades_tachas_servico_check;
ALTER TABLE necessidades_tachas ADD CONSTRAINT necessidades_tachas_servico_check 
  CHECK (servico IN ('Implantar', 'Substituir', 'Remover', 'Manter'));

ALTER TABLE necessidades_marcas_transversais DROP CONSTRAINT IF EXISTS necessidades_marcas_transversais_servico_check;
ALTER TABLE necessidades_marcas_transversais ADD CONSTRAINT necessidades_marcas_transversais_servico_check 
  CHECK (servico IN ('Implantar', 'Substituir', 'Remover', 'Manter'));

ALTER TABLE necessidades_cilindros DROP CONSTRAINT IF EXISTS necessidades_cilindros_servico_check;
ALTER TABLE necessidades_cilindros ADD CONSTRAINT necessidades_cilindros_servico_check 
  CHECK (servico IN ('Implantar', 'Substituir', 'Remover', 'Manter'));

ALTER TABLE necessidades_porticos DROP CONSTRAINT IF EXISTS necessidades_porticos_servico_check;
ALTER TABLE necessidades_porticos ADD CONSTRAINT necessidades_porticos_servico_check 
  CHECK (servico IN ('Implantar', 'Substituir', 'Remover', 'Manter'));

ALTER TABLE necessidades_defensas DROP CONSTRAINT IF EXISTS necessidades_defensas_servico_check;
ALTER TABLE necessidades_defensas ADD CONSTRAINT necessidades_defensas_servico_check 
  CHECK (servico IN ('Implantar', 'Substituir', 'Remover', 'Manter'));