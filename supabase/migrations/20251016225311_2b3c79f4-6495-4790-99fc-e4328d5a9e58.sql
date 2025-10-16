-- Remover política que permite coordenadores
DROP POLICY IF EXISTS "Admins and coordinators can update own supervisora" ON public.supervisoras;

-- Recriar política original restrita a admins
CREATE POLICY "Only admins can update supervisoras"
ON public.supervisoras
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));