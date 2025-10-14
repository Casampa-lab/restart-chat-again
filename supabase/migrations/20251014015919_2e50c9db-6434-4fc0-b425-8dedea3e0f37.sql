-- Corrigir RLS policies de ficha_placa para permitir coordenadores inserirem em nome de outros usuários

-- Remover policy antiga restritiva
DROP POLICY IF EXISTS "Users can create their own fichas placa" ON public.ficha_placa;

-- Criar nova policy que permite:
-- 1. Usuários criarem seus próprios registros
-- 2. Coordenadores e admins criarem registros em nome de qualquer usuário
CREATE POLICY "Users and coordinators can create fichas placa"
ON public.ficha_placa FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'coordenador'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);