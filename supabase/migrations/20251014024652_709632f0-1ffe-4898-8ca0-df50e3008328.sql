-- Criar políticas RLS para permitir visualização de inventário por lote/sessão ativa

-- 1. Política para ficha_placa (Placas)
CREATE POLICY "Users can view inventory from their active lot - placas"
ON public.ficha_placa FOR SELECT
USING (
  lote_id IN (
    SELECT lote_id 
    FROM public.sessoes_trabalho 
    WHERE user_id = auth.uid() 
    AND ativa = true
  )
  OR has_role(auth.uid(), 'coordenador'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2. Política para ficha_marcas_longitudinais (Marcas Longitudinais)
CREATE POLICY "Users can view inventory from their active lot - marcas"
ON public.ficha_marcas_longitudinais FOR SELECT
USING (
  lote_id IN (
    SELECT lote_id 
    FROM public.sessoes_trabalho 
    WHERE user_id = auth.uid() 
    AND ativa = true
  )
  OR has_role(auth.uid(), 'coordenador'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 3. Política para ficha_tachas (Tachas)
CREATE POLICY "Users can view inventory from their active lot - tachas"
ON public.ficha_tachas FOR SELECT
USING (
  lote_id IN (
    SELECT lote_id 
    FROM public.sessoes_trabalho 
    WHERE user_id = auth.uid() 
    AND ativa = true
  )
  OR has_role(auth.uid(), 'coordenador'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Política para ficha_cilindros (Cilindros)
CREATE POLICY "Users can view inventory from their active lot - cilindros"
ON public.ficha_cilindros FOR SELECT
USING (
  lote_id IN (
    SELECT lote_id 
    FROM public.sessoes_trabalho 
    WHERE user_id = auth.uid() 
    AND ativa = true
  )
  OR has_role(auth.uid(), 'coordenador'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 5. Política para ficha_porticos (Pórticos)
CREATE POLICY "Users can view inventory from their active lot - porticos"
ON public.ficha_porticos FOR SELECT
USING (
  lote_id IN (
    SELECT lote_id 
    FROM public.sessoes_trabalho 
    WHERE user_id = auth.uid() 
    AND ativa = true
  )
  OR has_role(auth.uid(), 'coordenador'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 6. Política para ficha_inscricoes (Inscrições/Marcas Transversais)
CREATE POLICY "Users can view inventory from their active lot - inscricoes"
ON public.ficha_inscricoes FOR SELECT
USING (
  lote_id IN (
    SELECT lote_id 
    FROM public.sessoes_trabalho 
    WHERE user_id = auth.uid() 
    AND ativa = true
  )
  OR has_role(auth.uid(), 'coordenador'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 7. Política para defensas (Defensas)
CREATE POLICY "Users can view inventory from their active lot - defensas"
ON public.defensas FOR SELECT
USING (
  lote_id IN (
    SELECT lote_id 
    FROM public.sessoes_trabalho 
    WHERE user_id = auth.uid() 
    AND ativa = true
  )
  OR has_role(auth.uid(), 'coordenador'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);