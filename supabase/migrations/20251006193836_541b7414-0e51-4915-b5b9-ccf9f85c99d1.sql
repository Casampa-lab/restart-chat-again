-- 1. CRÍTICO: Remover acesso público aos e-mails e restringir apenas a usuários autenticados
DROP POLICY IF EXISTS "Everyone can read active destinatarios" ON public.destinatarios_email;

CREATE POLICY "Authenticated users can read active destinatarios"
ON public.destinatarios_email
FOR SELECT
TO authenticated
USING (ativo = true AND (
  has_role(auth.uid(), 'coordenador'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'tecnico'::app_role)
));

-- 2. Adicionar visibilidade administrativa aos perfis de usuários
CREATE POLICY "Admins and coordinators can view all profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'coordenador'::app_role)
);

-- 3. Adicionar políticas UPDATE para não-conformidades
CREATE POLICY "Users can update their own nao_conformidades"
ON public.nao_conformidades
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coordenadores can update all nao_conformidades"
ON public.nao_conformidades
FOR UPDATE
USING (
  has_role(auth.uid(), 'coordenador'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Corrigir search_path das funções existentes
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_nc_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  new_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_registro FROM 3) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.registro_nc;
  
  new_number := 'NC' || LPAD(next_num::TEXT, 5, '0');
  RETURN new_number;
END;
$$;