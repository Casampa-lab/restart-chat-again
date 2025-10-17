-- Drop da política antiga restritiva
DROP POLICY IF EXISTS "Users can delete their own tachas" ON public.ficha_tachas;

-- Nova política para usuários comuns (só seus próprios registros)
CREATE POLICY "Users can delete own tachas"
  ON public.ficha_tachas FOR DELETE
  USING (auth.uid() = user_id);

-- Nova política para coordenadores e admins (podem deletar qualquer registro)
CREATE POLICY "Coordinators and admins can delete any tachas"
  ON public.ficha_tachas FOR DELETE
  USING (
    has_role(auth.uid(), 'coordenador'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
  );