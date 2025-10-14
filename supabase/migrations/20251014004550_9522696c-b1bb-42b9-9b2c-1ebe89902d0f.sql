-- Permitir que coordenadores e admins atualizem elementos pendentes
-- (necessário para aprovar/rejeitar)

DROP POLICY IF EXISTS "Coordenadores atualizam" ON public.elementos_pendentes_aprovacao;

CREATE POLICY "Coordenadores atualizam"
ON public.elementos_pendentes_aprovacao
FOR UPDATE
USING (
  has_role(auth.uid(), 'coordenador'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Permitir que coordenadores e admins vejam rodovias
-- (necessário para os JOINs em elementos_pendentes_aprovacao)

DROP POLICY IF EXISTS "Coordenadores e admins podem ver rodovias" ON public.rodovias;

CREATE POLICY "Coordenadores e admins podem ver rodovias"
ON public.rodovias
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'coordenador'::app_role) OR
  auth.uid() IS NOT NULL
);

-- Permitir que coordenadores e admins vejam lotes
-- (necessário para os JOINs em elementos_pendentes_aprovacao)

DROP POLICY IF EXISTS "Coordenadores e admins podem ver lotes" ON public.lotes;

CREATE POLICY "Coordenadores e admins podem ver lotes"
ON public.lotes
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'coordenador'::app_role) OR
  auth.uid() IS NOT NULL
);