-- Adicionar campos solucao_planilha e status_servico nas tabelas de inventário

-- 1. Inventário de Placas (ficha_placa)
ALTER TABLE ficha_placa 
ADD COLUMN IF NOT EXISTS solucao_planilha TEXT,
ADD COLUMN IF NOT EXISTS status_servico TEXT DEFAULT 'ATIVO';

-- 2. Inventário de Pórticos
ALTER TABLE ficha_porticos 
ADD COLUMN IF NOT EXISTS solucao_planilha TEXT,
ADD COLUMN IF NOT EXISTS status_servico TEXT DEFAULT 'ATIVO';

-- 3. Inventário de Inscrições
ALTER TABLE ficha_inscricoes 
ADD COLUMN IF NOT EXISTS solucao_planilha TEXT,
ADD COLUMN IF NOT EXISTS status_servico TEXT DEFAULT 'ATIVO';

-- 4. Inventário de Defensas
ALTER TABLE defensas 
ADD COLUMN IF NOT EXISTS solucao_planilha TEXT,
ADD COLUMN IF NOT EXISTS status_servico TEXT DEFAULT 'ATIVO';

COMMENT ON COLUMN ficha_placa.solucao_planilha IS 'Tipo de solução prevista no projeto: Implantar, Substituir ou Remover';
COMMENT ON COLUMN ficha_placa.status_servico IS 'Status do serviço: ATIVO, AGUARDANDO_REMOCAO, REMOVIDO, etc';

COMMENT ON COLUMN ficha_porticos.solucao_planilha IS 'Tipo de solução prevista no projeto: Implantar, Substituir ou Remover';
COMMENT ON COLUMN ficha_porticos.status_servico IS 'Status do serviço: ATIVO, AGUARDANDO_REMOCAO, REMOVIDO, etc';

COMMENT ON COLUMN ficha_inscricoes.solucao_planilha IS 'Tipo de solução prevista no projeto: Implantar, Substituir ou Remover';
COMMENT ON COLUMN ficha_inscricoes.status_servico IS 'Status do serviço: ATIVO, AGUARDANDO_REMOCAO, REMOVIDO, etc';

COMMENT ON COLUMN defensas.solucao_planilha IS 'Tipo de solução prevista no projeto: Implantar, Substituir ou Remover';
COMMENT ON COLUMN defensas.status_servico IS 'Status do serviço: ATIVO, AGUARDANDO_REMOCAO, REMOVIDO, etc';