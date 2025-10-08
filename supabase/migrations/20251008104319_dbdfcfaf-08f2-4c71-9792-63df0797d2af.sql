-- Criar enum para roles se não existir
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'coordenador', 'tecnico');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar tabela user_roles se não existir
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_roles
DROP POLICY IF EXISTS "Admins podem gerenciar roles" ON public.user_roles;
CREATE POLICY "Admins podem gerenciar roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users podem ver próprio role" ON public.user_roles;
CREATE POLICY "Users podem ver próprio role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);