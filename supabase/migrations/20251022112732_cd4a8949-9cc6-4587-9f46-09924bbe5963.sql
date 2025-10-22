-- Padronização completa de campos de localização
-- Renomear campos antigos para o padrão _inicial

-- 1. ficha_verificacao_itens (Fichas de Verificação SH/SV)
ALTER TABLE ficha_verificacao_itens 
  RENAME COLUMN km TO km_inicial;

ALTER TABLE ficha_verificacao_itens 
  RENAME COLUMN latitude TO latitude_inicial;

ALTER TABLE ficha_verificacao_itens 
  RENAME COLUMN longitude TO longitude_inicial;

-- 2. ficha_porticos_intervencoes - adicionar km_inicial se ainda não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ficha_porticos_intervencoes' AND column_name = 'km_inicial'
  ) THEN
    ALTER TABLE ficha_porticos_intervencoes ADD COLUMN km_inicial numeric;
  END IF;
  
  -- Se existe km antigo, copiar para km_inicial e remover
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ficha_porticos_intervencoes' AND column_name = 'km'
  ) THEN
    UPDATE ficha_porticos_intervencoes SET km_inicial = km WHERE km_inicial IS NULL;
    ALTER TABLE ficha_porticos_intervencoes DROP COLUMN km;
  END IF;
END $$;

-- 3. Padronizar tabelas de intervenções pontuais para usar _inicial
-- (para manter consistência, mesmo que sejam coordenadas de intervenção)

-- ficha_placa_intervencoes
ALTER TABLE ficha_placa_intervencoes 
  RENAME COLUMN latitude TO latitude_inicial;

ALTER TABLE ficha_placa_intervencoes 
  RENAME COLUMN longitude TO longitude_inicial;

-- ficha_porticos_intervencoes
ALTER TABLE ficha_porticos_intervencoes 
  RENAME COLUMN latitude TO latitude_inicial;

ALTER TABLE ficha_porticos_intervencoes 
  RENAME COLUMN longitude TO longitude_inicial;

-- ficha_inscricoes_intervencoes
ALTER TABLE ficha_inscricoes_intervencoes 
  RENAME COLUMN latitude TO latitude_inicial;

ALTER TABLE ficha_inscricoes_intervencoes 
  RENAME COLUMN longitude TO longitude_inicial;

-- 4. Padronizar tabelas de intervenções lineares
-- ficha_cilindros_intervencoes
ALTER TABLE ficha_cilindros_intervencoes 
  RENAME COLUMN latitude TO latitude_inicial;

ALTER TABLE ficha_cilindros_intervencoes 
  RENAME COLUMN longitude TO longitude_inicial;

-- ficha_tachas_intervencoes
ALTER TABLE ficha_tachas_intervencoes 
  RENAME COLUMN latitude TO latitude_inicial;

ALTER TABLE ficha_tachas_intervencoes 
  RENAME COLUMN longitude TO longitude_inicial;

-- ficha_marcas_longitudinais_intervencoes
ALTER TABLE ficha_marcas_longitudinais_intervencoes 
  RENAME COLUMN latitude TO latitude_inicial;

ALTER TABLE ficha_marcas_longitudinais_intervencoes 
  RENAME COLUMN longitude TO longitude_inicial;

-- defensas_intervencoes
ALTER TABLE defensas_intervencoes 
  RENAME COLUMN latitude TO latitude_inicial;

ALTER TABLE defensas_intervencoes 
  RENAME COLUMN longitude TO longitude_inicial;

COMMENT ON COLUMN ficha_verificacao_itens.km_inicial IS 'KM de referência do ponto de verificação';
COMMENT ON COLUMN ficha_verificacao_itens.latitude_inicial IS 'Latitude do ponto de verificação';
COMMENT ON COLUMN ficha_verificacao_itens.longitude_inicial IS 'Longitude do ponto de verificação';