-- Atualizar RLS policies para permitir usuários verem necessidades do seu lote
-- (não apenas as que eles mesmos importaram)

-- 1. MARCAS LONGITUDINAIS
DROP POLICY IF EXISTS "Users can view their own necessidades" ON public.necessidades_marcas_longitudinais;
DROP POLICY IF EXISTS "Users can create necessidades" ON public.necessidades_marcas_longitudinais;
DROP POLICY IF EXISTS "Users can update necessidades" ON public.necessidades_marcas_longitudinais;
DROP POLICY IF EXISTS "Users can delete necessidades" ON public.necessidades_marcas_longitudinais;

CREATE POLICY "Users can view necessidades from their lote"
ON public.necessidades_marcas_longitudinais FOR SELECT
USING (
  lote_id IN (
    SELECT lote_id FROM sessoes_trabalho 
    WHERE user_id = auth.uid() AND ativa = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordenador'::app_role)
);

CREATE POLICY "Users can create necessidades"
ON public.necessidades_marcas_longitudinais FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete necessidades from their lote"
ON public.necessidades_marcas_longitudinais FOR DELETE
USING (
  lote_id IN (
    SELECT lote_id FROM sessoes_trabalho 
    WHERE user_id = auth.uid() AND ativa = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordenador'::app_role)
);

-- 2. TACHAS
DROP POLICY IF EXISTS "Users can view their own necessidades" ON public.necessidades_tachas;
DROP POLICY IF EXISTS "Users can create necessidades" ON public.necessidades_tachas;
DROP POLICY IF EXISTS "Users can update necessidades" ON public.necessidades_tachas;
DROP POLICY IF EXISTS "Users can delete necessidades" ON public.necessidades_tachas;

CREATE POLICY "Users can view necessidades from their lote"
ON public.necessidades_tachas FOR SELECT
USING (
  lote_id IN (
    SELECT lote_id FROM sessoes_trabalho 
    WHERE user_id = auth.uid() AND ativa = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordenador'::app_role)
);

CREATE POLICY "Users can create necessidades"
ON public.necessidades_tachas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete necessidades from their lote"
ON public.necessidades_tachas FOR DELETE
USING (
  lote_id IN (
    SELECT lote_id FROM sessoes_trabalho 
    WHERE user_id = auth.uid() AND ativa = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordenador'::app_role)
);

-- 3. MARCAS TRANSVERSAIS
DROP POLICY IF EXISTS "Users can view their own necessidades" ON public.necessidades_marcas_transversais;
DROP POLICY IF EXISTS "Users can create necessidades" ON public.necessidades_marcas_transversais;
DROP POLICY IF EXISTS "Users can update necessidades" ON public.necessidades_marcas_transversais;
DROP POLICY IF EXISTS "Users can delete necessidades" ON public.necessidades_marcas_transversais;

CREATE POLICY "Users can view necessidades from their lote"
ON public.necessidades_marcas_transversais FOR SELECT
USING (
  lote_id IN (
    SELECT lote_id FROM sessoes_trabalho 
    WHERE user_id = auth.uid() AND ativa = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordenador'::app_role)
);

CREATE POLICY "Users can create necessidades"
ON public.necessidades_marcas_transversais FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete necessidades from their lote"
ON public.necessidades_marcas_transversais FOR DELETE
USING (
  lote_id IN (
    SELECT lote_id FROM sessoes_trabalho 
    WHERE user_id = auth.uid() AND ativa = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordenador'::app_role)
);

-- 4. CILINDROS
DROP POLICY IF EXISTS "Users can view their own necessidades" ON public.necessidades_cilindros;
DROP POLICY IF EXISTS "Users can create necessidades" ON public.necessidades_cilindros;
DROP POLICY IF EXISTS "Users can update necessidades" ON public.necessidades_cilindros;
DROP POLICY IF EXISTS "Users can delete necessidades" ON public.necessidades_cilindros;

CREATE POLICY "Users can view necessidades from their lote"
ON public.necessidades_cilindros FOR SELECT
USING (
  lote_id IN (
    SELECT lote_id FROM sessoes_trabalho 
    WHERE user_id = auth.uid() AND ativa = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordenador'::app_role)
);

CREATE POLICY "Users can create necessidades"
ON public.necessidades_cilindros FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete necessidades from their lote"
ON public.necessidades_cilindros FOR DELETE
USING (
  lote_id IN (
    SELECT lote_id FROM sessoes_trabalho 
    WHERE user_id = auth.uid() AND ativa = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordenador'::app_role)
);

-- 5. PLACAS
DROP POLICY IF EXISTS "Users can view their own necessidades" ON public.necessidades_placas;
DROP POLICY IF EXISTS "Users can create necessidades" ON public.necessidades_placas;
DROP POLICY IF EXISTS "Users can update necessidades" ON public.necessidades_placas;
DROP POLICY IF EXISTS "Users can delete necessidades" ON public.necessidades_placas;

CREATE POLICY "Users can view necessidades from their lote"
ON public.necessidades_placas FOR SELECT
USING (
  lote_id IN (
    SELECT lote_id FROM sessoes_trabalho 
    WHERE user_id = auth.uid() AND ativa = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordenador'::app_role)
);

CREATE POLICY "Users can create necessidades"
ON public.necessidades_placas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete necessidades from their lote"
ON public.necessidades_placas FOR DELETE
USING (
  lote_id IN (
    SELECT lote_id FROM sessoes_trabalho 
    WHERE user_id = auth.uid() AND ativa = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordenador'::app_role)
);

-- 6. PÓRTICOS
DROP POLICY IF EXISTS "Users can view their own necessidades" ON public.necessidades_porticos;
DROP POLICY IF EXISTS "Users can create necessidades" ON public.necessidades_porticos;
DROP POLICY IF EXISTS "Users can update necessidades" ON public.necessidades_porticos;
DROP POLICY IF EXISTS "Users can delete necessidades" ON public.necessidades_porticos;

CREATE POLICY "Users can view necessidades from their lote"
ON public.necessidades_porticos FOR SELECT
USING (
  lote_id IN (
    SELECT lote_id FROM sessoes_trabalho 
    WHERE user_id = auth.uid() AND ativa = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordenador'::app_role)
);

CREATE POLICY "Users can create necessidades"
ON public.necessidades_porticos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete necessidades from their lote"
ON public.necessidades_porticos FOR DELETE
USING (
  lote_id IN (
    SELECT lote_id FROM sessoes_trabalho 
    WHERE user_id = auth.uid() AND ativa = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordenador'::app_role)
);

-- 7. DEFENSAS
DROP POLICY IF EXISTS "Users can view their own necessidades" ON public.necessidades_defensas;
DROP POLICY IF EXISTS "Users can create necessidades" ON public.necessidades_defensas;
DROP POLICY IF EXISTS "Users can update necessidades" ON public.necessidades_defensas;
DROP POLICY IF EXISTS "Users can delete necessidades" ON public.necessidades_defensas;

CREATE POLICY "Users can view necessidades from their lote"
ON public.necessidades_defensas FOR SELECT
USING (
  lote_id IN (
    SELECT lote_id FROM sessoes_trabalho 
    WHERE user_id = auth.uid() AND ativa = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordenador'::app_role)
);

CREATE POLICY "Users can create necessidades"
ON public.necessidades_defensas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete necessidades from their lote"
ON public.necessidades_defensas FOR DELETE
USING (
  lote_id IN (
    SELECT lote_id FROM sessoes_trabalho 
    WHERE user_id = auth.uid() AND ativa = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'coordenador'::app_role)
);