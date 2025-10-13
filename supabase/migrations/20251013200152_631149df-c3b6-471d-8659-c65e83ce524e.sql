-- FASE 1: Remover campos do Inventário (ficha_porticos)
ALTER TABLE ficha_porticos 
  DROP COLUMN IF EXISTS estado_conservacao,
  DROP COLUMN IF EXISTS observacao;

-- FASE 2: Remover campos das Necessidades (necessidades_porticos)
ALTER TABLE necessidades_porticos 
  DROP COLUMN IF EXISTS estado_conservacao,
  DROP COLUMN IF EXISTS observacao;

-- FASE 3: Adicionar campo nas Intervenções (ficha_porticos_intervencoes)
ALTER TABLE ficha_porticos_intervencoes 
  ADD COLUMN IF NOT EXISTS observacao text;