-- FASE 1: Remover campos do Inventário (ficha_cilindros)
ALTER TABLE ficha_cilindros 
  DROP COLUMN IF EXISTS foto_url;

-- FASE 2: Adicionar campos nas Intervenções (ficha_cilindros_intervencoes)
ALTER TABLE ficha_cilindros_intervencoes 
  ADD COLUMN IF NOT EXISTS foto_url text;