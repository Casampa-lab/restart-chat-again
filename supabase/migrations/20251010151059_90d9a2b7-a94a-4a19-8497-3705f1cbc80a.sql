-- Update ficha_marcas_transversais structure based on spreadsheet
ALTER TABLE public.ficha_marcas_transversais 
  DROP COLUMN IF EXISTS km_inicial,
  DROP COLUMN IF EXISTS km_final,
  DROP COLUMN IF EXISTS tipo_demarcacao,
  DROP COLUMN IF EXISTS largura_cm,
  DROP COLUMN IF EXISTS latitude_inicial,
  DROP COLUMN IF EXISTS longitude_inicial,
  DROP COLUMN IF EXISTS latitude_final,
  DROP COLUMN IF EXISTS longitude_final;

ALTER TABLE public.ficha_marcas_transversais 
  ADD COLUMN IF NOT EXISTS km NUMERIC,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS snv TEXT,
  ADD COLUMN IF NOT EXISTS sigla TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS outros_materiais TEXT,
  ADD COLUMN IF NOT EXISTS area_m2 NUMERIC;

-- Update intervencoes_marcas_transversais structure
ALTER TABLE public.intervencoes_marcas_transversais 
  DROP COLUMN IF EXISTS km_inicial,
  DROP COLUMN IF EXISTS km_final,
  DROP COLUMN IF EXISTS tipo_demarcacao,
  DROP COLUMN IF EXISTS latitude_inicial,
  DROP COLUMN IF EXISTS longitude_inicial,
  DROP COLUMN IF EXISTS latitude_final,
  DROP COLUMN IF EXISTS longitude_final;

ALTER TABLE public.intervencoes_marcas_transversais 
  ADD COLUMN IF NOT EXISTS km NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS snv TEXT,
  ADD COLUMN IF NOT EXISTS sigla TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS outros_materiais TEXT,
  ADD COLUMN IF NOT EXISTS area_m2 NUMERIC;