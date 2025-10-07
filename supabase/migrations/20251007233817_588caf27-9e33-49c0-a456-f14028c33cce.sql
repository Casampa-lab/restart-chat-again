-- FASE 1: ESTRUTURA MULTI-TENANT (limpeza e recriação)

-- Criar tabela de supervisoras se não existir
CREATE TABLE IF NOT EXISTS public.supervisoras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_empresa text NOT NULL,
  logo_url text,
  usar_logo_customizado boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Adicionar colunas se não existirem
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='supervisora_id') THEN
    ALTER TABLE public.profiles ADD COLUMN supervisora_id uuid REFERENCES public.supervisoras(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empresas' AND column_name='supervisora_id') THEN
    ALTER TABLE public.empresas ADD COLUMN supervisora_id uuid REFERENCES public.supervisoras(id);
  END IF;
END $$;

-- Criar supervisora padrão se não existir
INSERT INTO public.supervisoras (nome_empresa, usar_logo_customizado)
SELECT 'Supervisora Principal', false
WHERE NOT EXISTS (SELECT 1 FROM public.supervisoras);

-- Vincular dados existentes
DO $$
DECLARE
  supervisora_padrao_id uuid;
BEGIN
  SELECT id INTO supervisora_padrao_id FROM public.supervisoras LIMIT 1;
  
  UPDATE public.profiles SET supervisora_id = supervisora_padrao_id WHERE supervisora_id IS NULL;
  UPDATE public.empresas SET supervisora_id = supervisora_padrao_id WHERE supervisora_id IS NULL;
END $$;

-- Enable RLS
ALTER TABLE public.supervisoras ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas
DROP POLICY IF EXISTS "Admins podem gerenciar todas supervisoras" ON public.supervisoras;
DROP POLICY IF EXISTS "Usuários veem apenas sua supervisora" ON public.supervisoras;
DROP POLICY IF EXISTS "Admins and coordinators can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem ver todos profiles" ON public.profiles;
DROP POLICY IF EXISTS "Coordenadores veem profiles da mesma supervisora" ON public.profiles;
DROP POLICY IF EXISTS "Authorized users can read empresas" ON public.empresas;
DROP POLICY IF EXISTS "Usuários veem empresas da mesma supervisora" ON public.empresas;

-- Criar policies novas
CREATE POLICY "Admins gerenciam supervisoras"
  ON public.supervisoras FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Usuários veem sua supervisora"
  ON public.supervisoras FOR SELECT
  USING (
    id IN (SELECT supervisora_id FROM public.profiles WHERE id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins veem todos profiles"
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Coordenadores veem profiles mesma supervisora"
  ON public.profiles FOR SELECT
  USING (
    has_role(auth.uid(), 'coordenador'::app_role) 
    AND supervisora_id IN (SELECT supervisora_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários veem empresas mesma supervisora"
  ON public.empresas FOR SELECT
  USING (
    supervisora_id IN (SELECT supervisora_id FROM public.profiles WHERE id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_supervisoras_updated_at ON public.supervisoras;
CREATE TRIGGER update_supervisoras_updated_at
  BEFORE UPDATE ON public.supervisoras
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();