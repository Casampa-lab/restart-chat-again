-- Tornar campos FK opcionais nas tabelas de intervenções para permitir registro direto em campo
-- Isso permite registrar intervenções sem elemento de inventário pré-cadastrado

-- 1. Defensas
ALTER TABLE defensas_intervencoes 
  ALTER COLUMN defensa_id DROP NOT NULL;

-- 2. Tachas
ALTER TABLE ficha_tachas_intervencoes 
  ALTER COLUMN ficha_tachas_id DROP NOT NULL;

-- 3. Marcas Longitudinais
ALTER TABLE ficha_marcas_longitudinais_intervencoes 
  ALTER COLUMN ficha_marcas_longitudinais_id DROP NOT NULL;

-- 4. Inscrições
ALTER TABLE ficha_inscricoes_intervencoes 
  ALTER COLUMN ficha_inscricoes_id DROP NOT NULL;

-- 5. Cilindros
ALTER TABLE ficha_cilindros_intervencoes 
  ALTER COLUMN ficha_cilindros_id DROP NOT NULL;

-- 6. Pórticos
ALTER TABLE ficha_porticos_intervencoes 
  ALTER COLUMN ficha_porticos_id DROP NOT NULL;

-- 7. Placas
ALTER TABLE ficha_placa_intervencoes 
  ALTER COLUMN ficha_placa_id DROP NOT NULL;

-- Atualizar política RLS de defensas para permitir inserções sem FK
DROP POLICY IF EXISTS "Users can create intervencoes for defensas" ON defensas_intervencoes;

CREATE POLICY "Users can create intervencoes for defensas" 
ON defensas_intervencoes 
FOR INSERT 
WITH CHECK (
  -- Permitir se for execução direta (sem FK) OU se tem acesso à defensa
  (defensa_id IS NULL AND tipo_origem = 'execucao') OR
  (defensa_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM defensas 
    WHERE defensas.id = defensas_intervencoes.defensa_id 
    AND (defensas.user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordenador'))
  ))
);

-- Atualizar política RLS de tachas
DROP POLICY IF EXISTS "Users can create intervencoes for tachas" ON ficha_tachas_intervencoes;

CREATE POLICY "Users can create intervencoes for tachas" 
ON ficha_tachas_intervencoes 
FOR INSERT 
WITH CHECK (
  (ficha_tachas_id IS NULL AND tipo_origem = 'execucao') OR
  (ficha_tachas_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM ficha_tachas 
    WHERE ficha_tachas.id = ficha_tachas_intervencoes.ficha_tachas_id 
    AND (ficha_tachas.user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordenador'))
  ))
);

-- Atualizar política RLS de marcas longitudinais
DROP POLICY IF EXISTS "Users can create intervencoes for marcas longitudinais" ON ficha_marcas_longitudinais_intervencoes;

CREATE POLICY "Users can create intervencoes for marcas longitudinais" 
ON ficha_marcas_longitudinais_intervencoes 
FOR INSERT 
WITH CHECK (
  (ficha_marcas_longitudinais_id IS NULL AND tipo_origem = 'execucao') OR
  (ficha_marcas_longitudinais_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM ficha_marcas_longitudinais 
    WHERE ficha_marcas_longitudinais.id = ficha_marcas_longitudinais_intervencoes.ficha_marcas_longitudinais_id 
    AND (ficha_marcas_longitudinais.user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordenador'))
  ))
);

-- Atualizar política RLS de inscrições
DROP POLICY IF EXISTS "Users can create intervencoes for inscricoes" ON ficha_inscricoes_intervencoes;

CREATE POLICY "Users can create intervencoes for inscricoes" 
ON ficha_inscricoes_intervencoes 
FOR INSERT 
WITH CHECK (
  (ficha_inscricoes_id IS NULL AND tipo_origem = 'execucao') OR
  (ficha_inscricoes_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM ficha_inscricoes 
    WHERE ficha_inscricoes.id = ficha_inscricoes_intervencoes.ficha_inscricoes_id 
    AND (ficha_inscricoes.user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordenador'))
  ))
);

-- Atualizar política RLS de cilindros
DROP POLICY IF EXISTS "Users can create intervencoes for cilindros" ON ficha_cilindros_intervencoes;

CREATE POLICY "Users can create intervencoes for cilindros" 
ON ficha_cilindros_intervencoes 
FOR INSERT 
WITH CHECK (
  (ficha_cilindros_id IS NULL AND tipo_origem = 'execucao') OR
  (ficha_cilindros_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM ficha_cilindros 
    WHERE ficha_cilindros.id = ficha_cilindros_intervencoes.ficha_cilindros_id 
    AND (ficha_cilindros.user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordenador'))
  ))
);

-- Atualizar política RLS de pórticos
DROP POLICY IF EXISTS "Users can create intervencoes for porticos" ON ficha_porticos_intervencoes;

CREATE POLICY "Users can create intervencoes for porticos" 
ON ficha_porticos_intervencoes 
FOR INSERT 
WITH CHECK (
  (ficha_porticos_id IS NULL AND tipo_origem = 'execucao') OR
  (ficha_porticos_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM ficha_porticos 
    WHERE ficha_porticos.id = ficha_porticos_intervencoes.ficha_porticos_id 
    AND (ficha_porticos.user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordenador'))
  ))
);

-- Atualizar política RLS de placas
DROP POLICY IF EXISTS "Users can create intervencoes for placas" ON ficha_placa_intervencoes;

CREATE POLICY "Users can create intervencoes for placas" 
ON ficha_placa_intervencoes 
FOR INSERT 
WITH CHECK (
  (ficha_placa_id IS NULL AND tipo_origem = 'execucao') OR
  (ficha_placa_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM ficha_placa 
    WHERE ficha_placa.id = ficha_placa_intervencoes.ficha_placa_id 
    AND (ficha_placa.user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordenador'))
  ))
);