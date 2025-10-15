-- Adicionar foreign keys entre auditoria_sinalizacoes e profiles
ALTER TABLE auditoria_sinalizacoes
ADD CONSTRAINT auditoria_sinalizacoes_sinalizado_por_fkey 
FOREIGN KEY (sinalizado_por) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE auditoria_sinalizacoes
ADD CONSTRAINT auditoria_sinalizacoes_resolvido_por_fkey 
FOREIGN KEY (resolvido_por) REFERENCES profiles(id) ON DELETE SET NULL;