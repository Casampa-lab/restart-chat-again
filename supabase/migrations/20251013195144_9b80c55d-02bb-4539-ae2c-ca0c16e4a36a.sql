-- FASE 1: Migrações SQL - Inventário (ficha_placa)

-- 1.1 Adicionar campo faltante
ALTER TABLE ficha_placa 
  ADD COLUMN IF NOT EXISTS retro_pelicula_fundo numeric;

-- 1.2 Migrar dados do campo ambíguo (assumindo que retrorrefletividade era fundo)
UPDATE ficha_placa 
SET retro_pelicula_fundo = retrorrefletividade 
WHERE retro_pelicula_fundo IS NULL AND retrorrefletividade IS NOT NULL;

-- 1.3 Remover campos duplicados/ambíguos
ALTER TABLE ficha_placa 
  DROP COLUMN IF EXISTS pelicula;

ALTER TABLE ficha_placa 
  DROP COLUMN IF EXISTS retrorrefletividade;

-- FASE 2: Migrações SQL - Necessidades (necessidades_placas)

-- Remover campos que são características do inventário
ALTER TABLE necessidades_placas 
  DROP COLUMN IF EXISTS modelo;

ALTER TABLE necessidades_placas 
  DROP COLUMN IF EXISTS descricao;

ALTER TABLE necessidades_placas 
  DROP COLUMN IF EXISTS pelicula;

ALTER TABLE necessidades_placas 
  DROP COLUMN IF EXISTS retrorrefletividade;

-- FASE 3: Migrações SQL - Intervenções (ficha_placa_intervencoes)

-- Renomear pelicula para deixar claro que é o NOVO valor
ALTER TABLE ficha_placa_intervencoes 
  RENAME COLUMN pelicula TO tipo_pelicula_fundo_novo;

-- Garantir que suporte e substrato são NULL por padrão (preenchidos apenas se mudaram)
ALTER TABLE ficha_placa_intervencoes 
  ALTER COLUMN suporte DROP NOT NULL;

ALTER TABLE ficha_placa_intervencoes 
  ALTER COLUMN substrato DROP NOT NULL;