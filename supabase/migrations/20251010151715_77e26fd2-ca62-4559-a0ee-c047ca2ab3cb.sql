-- Update ficha_tachas structure to match Excel spreadsheet
ALTER TABLE public.ficha_tachas
  DROP COLUMN IF EXISTS tipo_tacha,
  DROP COLUMN IF EXISTS cor,
  DROP COLUMN IF EXISTS lado,
  DROP COLUMN IF EXISTS material,
  DROP COLUMN IF EXISTS estado_conservacao;

ALTER TABLE public.ficha_tachas
  ADD COLUMN IF NOT EXISTS snv TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS corpo TEXT,
  ADD COLUMN IF NOT EXISTS refletivo TEXT,
  ADD COLUMN IF NOT EXISTS cor_refletivo TEXT,
  ADD COLUMN IF NOT EXISTS extensao_km NUMERIC,
  ADD COLUMN IF NOT EXISTS local_implantacao TEXT,
  ADD COLUMN IF NOT EXISTS espacamento_m NUMERIC;

-- Update intervencoes_tacha structure to match Excel spreadsheet
ALTER TABLE public.intervencoes_tacha
  DROP COLUMN IF EXISTS tipo_tacha,
  DROP COLUMN IF EXISTS cor,
  DROP COLUMN IF EXISTS lado,
  DROP COLUMN IF EXISTS material,
  DROP COLUMN IF EXISTS estado_conservacao;

ALTER TABLE public.intervencoes_tacha
  ADD COLUMN IF NOT EXISTS snv TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS corpo TEXT,
  ADD COLUMN IF NOT EXISTS refletivo TEXT,
  ADD COLUMN IF NOT EXISTS cor_refletivo TEXT,
  ADD COLUMN IF NOT EXISTS local_implantacao TEXT,
  ADD COLUMN IF NOT EXISTS espacamento_m NUMERIC;