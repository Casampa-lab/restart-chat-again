-- FASE 1: ESTRUTURA MULTI-TENANT (corrigida)

-- Criar tabela de supervisoras (multi-registro)
CREATE TABLE IF NOT EXISTS public.supervisoras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_empresa text NOT NULL,
  logo_url text,
  usar_logo_customizado boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Adicionar supervisora_id em profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS supervisora_id uuid REFERENCES public.supervisoras(id);

-- Adicionar supervisora_id em empresas
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS supervisora_id uuid REFERENCES public.supervisoras(id);

-- Criar uma supervisora padrão para dados existentes
INSERT INTO public.supervisoras (nome_empresa, usar_logo_customizado)
VALUES ('Supervisora Principal', false)
ON CONFLICT DO NOTHING;

-- Vincular todos dados existentes à supervisora padrão
DO $$
DECLARE
  supervisora_padrao_id uuid;
BEGIN
  SELECT id INTO supervisora_padrao_id FROM public.supervisoras LIMIT 1;
  
  -- Atualizar profiles sem supervisora
  UPDATE public.profiles 
  SET supervisora_id = supervisora_padrao_id 
  WHERE supervisora_id IS NULL;
  
  -- Atualizar empresas sem supervisora
  UPDATE public.empresas 
  SET supervisora_id = supervisora_padrao_id 
  WHERE supervisora_id IS NULL;
END $$;

-- Enable RLS
ALTER TABLE public.supervisoras ENABLE ROW LEVEL SECURITY;

-- RLS Policies para supervisoras
CREATE POLICY "Admins podem gerenciar todas supervisoras"
  ON public.supervisoras
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Usuários veem apenas sua supervisora"
  ON public.supervisoras
  FOR SELECT
  USING (
    id IN (
      SELECT supervisora_id FROM public.profiles WHERE id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Atualizar RLS de profiles
DROP POLICY IF EXISTS "Admins and coordinators can view all profiles" ON public.profiles;

CREATE POLICY "Admins podem ver todos profiles"
  ON public.profiles
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Coordenadores veem profiles da mesma supervisora"
  ON public.profiles
  FOR SELECT
  USING (
    has_role(auth.uid(), 'coordenador'::app_role) 
    AND supervisora_id IN (
      SELECT supervisora_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Atualizar RLS de empresas
DROP POLICY IF EXISTS "Authorized users can read empresas" ON public.empresas;

CREATE POLICY "Usuários veem empresas da mesma supervisora"
  ON public.empresas
  FOR SELECT
  USING (
    supervisora_id IN (
      SELECT supervisora_id FROM public.profiles WHERE id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Trigger para updated_at
CREATE TRIGGER update_supervisoras_updated_at
  BEFORE UPDATE ON public.supervisoras
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.supervisoras IS 'Empresas supervisoras - cada uma é um tenant separado';
COMMENT ON COLUMN public.profiles.supervisora_id IS 'Vincula usuário a uma supervisora específica';
COMMENT ON COLUMN public.empresas.supervisora_id IS 'Vincula empresa executora a uma supervisora';