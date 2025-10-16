-- Habilitar RLS na tabela nao_conformidades se ainda não estiver
ALTER TABLE public.nao_conformidades ENABLE ROW LEVEL SECURITY;

-- Drop políticas existentes se houver (para recriar)
DROP POLICY IF EXISTS "Coordenadores podem criar NCs" ON public.nao_conformidades;
DROP POLICY IF EXISTS "Usuários podem ver próprias NCs" ON public.nao_conformidades;
DROP POLICY IF EXISTS "Coordenadores podem ver todas NCs" ON public.nao_conformidades;
DROP POLICY IF EXISTS "Coordenadores podem atualizar NCs" ON public.nao_conformidades;

-- Política para INSERT: Coordenadores e admins podem criar NCs
CREATE POLICY "Coordenadores podem criar NCs"
ON public.nao_conformidades
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'coordenador') OR 
  has_role(auth.uid(), 'admin')
);

-- Política para SELECT: Usuários veem suas próprias NCs
CREATE POLICY "Usuários podem ver próprias NCs"
ON public.nao_conformidades
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Política para SELECT: Coordenadores e admins veem todas
CREATE POLICY "Coordenadores podem ver todas NCs"
ON public.nao_conformidades
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'coordenador') OR 
  has_role(auth.uid(), 'admin')
);

-- Política para UPDATE: Coordenadores e admins podem atualizar
CREATE POLICY "Coordenadores podem atualizar NCs"
ON public.nao_conformidades
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'coordenador') OR 
  has_role(auth.uid(), 'admin')
);