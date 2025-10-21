-- ====================================================================
-- ETAPA 3B: Padronizar campos km em tabelas de cadastro pontuais
-- Convenção VABLE: elementos pontuais usam km_inicial (não km)
-- ====================================================================

-- 3B.1 - Renomear km → km_inicial em ficha_placa
ALTER TABLE ficha_placa 
  RENAME COLUMN km TO km_inicial;

-- 3B.2 - Renomear km → km_inicial em ficha_porticos
ALTER TABLE ficha_porticos 
  RENAME COLUMN km TO km_inicial;

-- Comentários para documentar convenção VABLE
COMMENT ON COLUMN ficha_placa.km_inicial IS 'Convenção VABLE: placas são elementos pontuais, usam km_inicial (não km)';
COMMENT ON COLUMN ficha_porticos.km_inicial IS 'Convenção VABLE: pórticos são elementos pontuais, usam km_inicial (não km)';