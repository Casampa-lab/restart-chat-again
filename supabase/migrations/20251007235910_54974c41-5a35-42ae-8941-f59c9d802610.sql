-- Criar função para obter supervisora_id do usuário sem RLS
CREATE OR REPLACE FUNCTION public.get_user_supervisora_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT supervisora_id
  FROM public.profiles
  WHERE id = _user_id
$$;

-- Recriar a política de coordenadores usando a função
DROP POLICY IF EXISTS "Coordenadores veem profiles mesma supervisora" ON public.profiles;

CREATE POLICY "Coordenadores veem profiles mesma supervisora"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'coordenador'::app_role) 
  AND supervisora_id = get_user_supervisora_id(auth.uid())
);

-- Dropar TODAS as políticas antigas da supervisoras e recriar
DROP POLICY IF EXISTS "Apenas admins podem gerenciar supervisoras" ON public.supervisoras;
DROP POLICY IF EXISTS "Admins full access supervisoras" ON public.supervisoras;
DROP POLICY IF EXISTS "Coordenadores veem própria supervisora" ON public.supervisoras;

CREATE POLICY "Admins full access supervisoras"
ON public.supervisoras
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Coordenadores veem própria supervisora"
ON public.supervisoras
FOR SELECT
USING (
  has_role(auth.uid(), 'coordenador'::app_role)
  AND id = get_user_supervisora_id(auth.uid())
);