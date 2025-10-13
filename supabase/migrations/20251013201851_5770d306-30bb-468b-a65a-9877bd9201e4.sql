-- FASE 1: Remover campos do Inventário (ficha_inscricoes)
ALTER TABLE ficha_inscricoes 
  DROP COLUMN IF EXISTS estado_conservacao,
  DROP COLUMN IF EXISTS foto_url;

-- FASE 2: Adicionar campos nas Intervenções (ficha_inscricoes_intervencoes)
ALTER TABLE ficha_inscricoes_intervencoes 
  ADD COLUMN IF NOT EXISTS estado_conservacao text,
  ADD COLUMN IF NOT EXISTS observacao text,
  ADD COLUMN IF NOT EXISTS foto_url text;