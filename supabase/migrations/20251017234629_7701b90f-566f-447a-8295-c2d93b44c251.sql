-- PASSO 1: Adicionar supervisora_id na tabela lotes
ALTER TABLE public.lotes 
ADD COLUMN IF NOT EXISTS supervisora_id UUID REFERENCES public.supervisoras(id);

-- PASSO 2: Migrar dados existentes
-- Transferir supervisora_id de empresas → lotes
UPDATE public.lotes l
SET supervisora_id = e.supervisora_id
FROM public.empresas e
WHERE l.empresa_id = e.id
AND l.supervisora_id IS NULL;

-- PASSO 3: Remover política RLS antiga ANTES de remover a coluna
DROP POLICY IF EXISTS "Usuários veem empresas mesma supervisora" ON public.empresas;
DROP POLICY IF EXISTS "Apenas admins podem atualizar empresas" ON public.empresas;
DROP POLICY IF EXISTS "Apenas admins podem criar empresas" ON public.empresas;
DROP POLICY IF EXISTS "Apenas admins podem deletar empresas" ON public.empresas;

-- PASSO 4: Remover supervisora_id da tabela empresas
ALTER TABLE public.empresas 
DROP COLUMN IF EXISTS supervisora_id;

-- PASSO 5: Criar novas políticas RLS para empresas
CREATE POLICY "Usuários autenticados veem empresas"
ON public.empresas
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Apenas admins gerenciam empresas"
ON public.empresas
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- PASSO 6: Tornar supervisora_id obrigatório em lotes
ALTER TABLE public.lotes 
ALTER COLUMN supervisora_id SET NOT NULL;

-- PASSO 7: Criar RLS para lotes baseado em supervisora
DROP POLICY IF EXISTS "Usuários veem lotes da própria supervisora" ON public.lotes;

CREATE POLICY "Usuários veem lotes da própria supervisora"
ON public.lotes
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR
  has_role(auth.uid(), 'coordenador'::app_role)
  OR
  (supervisora_id IN (
    SELECT supervisora_id 
    FROM profiles 
    WHERE id = auth.uid()
  ))
);