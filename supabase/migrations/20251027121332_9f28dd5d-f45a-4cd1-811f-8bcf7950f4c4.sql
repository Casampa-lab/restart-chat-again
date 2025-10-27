-- ============================================
-- CORRIGIR RLS POLICY PARA CILINDROS
-- ============================================
-- Remover policy antiga restritiva que bloqueava manutenção sem cilindro
DROP POLICY IF EXISTS "Users can create intervencoes for cilindros" 
ON public.ficha_cilindros_intervencoes;

-- Criar policy nova simplificada baseada em user_id
CREATE POLICY "Users can create their own cilindros interventions"
ON public.ficha_cilindros_intervencoes
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'coordenador'::app_role)
);