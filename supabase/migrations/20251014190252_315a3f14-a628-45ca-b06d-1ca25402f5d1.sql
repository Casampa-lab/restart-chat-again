-- Adicionar políticas RLS para coordenadores em lotes_rodovias

CREATE POLICY "Coordenadores podem inserir lotes_rodovias"
ON public.lotes_rodovias
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'coordenador'::app_role)
);

CREATE POLICY "Coordenadores podem atualizar lotes_rodovias"
ON public.lotes_rodovias
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'coordenador'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'coordenador'::app_role)
);

CREATE POLICY "Coordenadores podem deletar lotes_rodovias"
ON public.lotes_rodovias
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'coordenador'::app_role)
);