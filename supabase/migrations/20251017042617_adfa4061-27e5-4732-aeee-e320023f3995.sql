-- Criar política RLS para permitir que usuários autenticados leiam rodovias
CREATE POLICY "Authenticated users can read rodovias"
ON public.rodovias
FOR SELECT
TO authenticated
USING (true);