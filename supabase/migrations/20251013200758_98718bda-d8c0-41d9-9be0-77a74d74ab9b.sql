-- FASE 1: Remover campos do Inventário (ficha_tachas)
ALTER TABLE ficha_tachas 
  DROP COLUMN IF EXISTS observacao,
  DROP COLUMN IF EXISTS foto_url,
  DROP COLUMN IF EXISTS descricao;

-- FASE 2: Adicionar campos nas Intervenções (ficha_tachas_intervencoes)
ALTER TABLE ficha_tachas_intervencoes 
  ADD COLUMN IF NOT EXISTS observacao text,
  ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS descricao text;