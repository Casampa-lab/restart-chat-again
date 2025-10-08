-- Adicionar política para admins gerenciarem profiles
DROP POLICY IF EXISTS "Admins podem atualizar qualquer profile" ON public.profiles;

CREATE POLICY "Admins podem atualizar qualquer profile"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));