-- ====================================================================
-- ETAPA 2: Corrigir ficha_inscricoes e ficha_inscricoes_intervencoes
-- Convenção VABLE: Inscrições são elementos PONTUAIS
-- Devem ter APENAS: km_inicial, latitude_inicial, longitude_inicial
-- NÃO devem ter: km_final, latitude_final, longitude_final
-- ====================================================================

-- 2.1 - Remover campos _final de ficha_inscricoes (elementos pontuais)
ALTER TABLE ficha_inscricoes 
  DROP COLUMN IF EXISTS km_final;

ALTER TABLE ficha_inscricoes 
  DROP COLUMN IF EXISTS latitude_final;

ALTER TABLE ficha_inscricoes 
  DROP COLUMN IF EXISTS longitude_final;

-- 2.2 - Remover campos _final de ficha_inscricoes_intervencoes
ALTER TABLE ficha_inscricoes_intervencoes 
  DROP COLUMN IF EXISTS km_final;

-- Comentários para documentar convenção VABLE
COMMENT ON COLUMN ficha_inscricoes.km_inicial IS 'Convenção VABLE: inscrições são elementos pontuais, apenas km_inicial (sem km_final)';
COMMENT ON COLUMN ficha_inscricoes_intervencoes.km_inicial IS 'Convenção VABLE: inscrições são elementos pontuais, apenas km_inicial (sem km_final)';