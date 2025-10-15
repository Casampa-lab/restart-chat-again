-- Corrigir constraint tipo_elemento para incluir cilindros
ALTER TABLE auditoria_sinalizacoes 
DROP CONSTRAINT IF EXISTS auditoria_sinalizacoes_tipo_elemento_check;

ALTER TABLE auditoria_sinalizacoes 
ADD CONSTRAINT auditoria_sinalizacoes_tipo_elemento_check 
CHECK (tipo_elemento IN (
  'placas',
  'marcas_longitudinais', 
  'tachas',
  'inscricoes',
  'cilindros',
  'porticos',
  'defensas'
));