-- Adicionar user_id em todas as tabelas de intervenções
ALTER TABLE ficha_cilindros_intervencoes 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE defensas_intervencoes 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE ficha_marcas_longitudinais_intervencoes 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE ficha_placa_intervencoes 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE ficha_inscricoes_intervencoes 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE ficha_tachas_intervencoes 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE ficha_porticos_intervencoes 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Popular user_id existente através dos relacionamentos
UPDATE ficha_cilindros_intervencoes fci
SET user_id = fc.user_id
FROM ficha_cilindros fc
WHERE fci.ficha_cilindros_id = fc.id
  AND fci.user_id IS NULL;

UPDATE defensas_intervencoes di
SET user_id = d.user_id
FROM defensas d
WHERE di.defensa_id = d.id
  AND di.user_id IS NULL;

UPDATE ficha_marcas_longitudinais_intervencoes fmi
SET user_id = fm.user_id
FROM ficha_marcas_longitudinais fm
WHERE fmi.ficha_marcas_longitudinais_id = fm.id
  AND fmi.user_id IS NULL;

UPDATE ficha_placa_intervencoes fpi
SET user_id = fp.user_id
FROM ficha_placa fp
WHERE fpi.ficha_placa_id = fp.id
  AND fpi.user_id IS NULL;

UPDATE ficha_inscricoes_intervencoes fii
SET user_id = fi.user_id
FROM ficha_inscricoes fi
WHERE fii.ficha_inscricoes_id = fi.id
  AND fii.user_id IS NULL;

UPDATE ficha_tachas_intervencoes fti
SET user_id = ft.user_id
FROM ficha_tachas ft
WHERE fti.ficha_tachas_id = ft.id
  AND fti.user_id IS NULL;

UPDATE ficha_porticos_intervencoes fpi
SET user_id = fp.user_id
FROM ficha_porticos fp
WHERE fpi.ficha_porticos_id = fp.id
  AND fpi.user_id IS NULL;

-- Atualizar RLS policies para permitir SELECT baseado em user_id

-- Cilindros
DROP POLICY IF EXISTS "Users can view intervencoes of their own cilindros" ON ficha_cilindros_intervencoes;
CREATE POLICY "Users can view their own cilindros intervencoes"
ON ficha_cilindros_intervencoes
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM ficha_cilindros
    WHERE ficha_cilindros.id = ficha_cilindros_intervencoes.ficha_cilindros_id
    AND ficha_cilindros.user_id = auth.uid()
  )
);

-- Defensas
DROP POLICY IF EXISTS "Users can view intervencoes of their own defensas" ON defensas_intervencoes;
CREATE POLICY "Users can view their own defensas intervencoes"
ON defensas_intervencoes
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM defensas
    WHERE defensas.id = defensas_intervencoes.defensa_id
    AND defensas.user_id = auth.uid()
  )
);

-- Marcas Longitudinais
DROP POLICY IF EXISTS "Users can view intervencoes of their own marcas longitudinais" ON ficha_marcas_longitudinais_intervencoes;
CREATE POLICY "Users can view their own marcas longitudinais intervencoes"
ON ficha_marcas_longitudinais_intervencoes
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM ficha_marcas_longitudinais
    WHERE ficha_marcas_longitudinais.id = ficha_marcas_longitudinais_intervencoes.ficha_marcas_longitudinais_id
    AND ficha_marcas_longitudinais.user_id = auth.uid()
  )
);

-- Placas
DROP POLICY IF EXISTS "Users can view intervencoes of their own placas" ON ficha_placa_intervencoes;
CREATE POLICY "Users can view their own placas intervencoes"
ON ficha_placa_intervencoes
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM ficha_placa
    WHERE ficha_placa.id = ficha_placa_intervencoes.ficha_placa_id
    AND ficha_placa.user_id = auth.uid()
  )
);

-- Inscrições
DROP POLICY IF EXISTS "Users can view intervencoes of their own inscricoes" ON ficha_inscricoes_intervencoes;
CREATE POLICY "Users can view their own inscricoes intervencoes"
ON ficha_inscricoes_intervencoes
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM ficha_inscricoes
    WHERE ficha_inscricoes.id = ficha_inscricoes_intervencoes.ficha_inscricoes_id
    AND ficha_inscricoes.user_id = auth.uid()
  )
);

-- Tachas
DROP POLICY IF EXISTS "Users can view intervencoes of their own tachas" ON ficha_tachas_intervencoes;
CREATE POLICY "Users can view their own tachas intervencoes"
ON ficha_tachas_intervencoes
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM ficha_tachas
    WHERE ficha_tachas.id = ficha_tachas_intervencoes.ficha_tachas_id
    AND ficha_tachas.user_id = auth.uid()
  )
);

-- Pórticos
DROP POLICY IF EXISTS "Users can view intervencoes of their own porticos" ON ficha_porticos_intervencoes;
CREATE POLICY "Users can view their own porticos intervencoes"
ON ficha_porticos_intervencoes
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM ficha_porticos
    WHERE ficha_porticos.id = ficha_porticos_intervencoes.ficha_porticos_id
    AND ficha_porticos.user_id = auth.uid()
  )
);