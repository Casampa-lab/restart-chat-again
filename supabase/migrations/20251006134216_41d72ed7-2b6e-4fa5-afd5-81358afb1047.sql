-- Criar tabela de empresas
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de rodovias
CREATE TABLE public.rodovias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE, -- ex: BR-040
  nome TEXT NOT NULL,
  km_inicial DECIMAL(10,3),
  km_final DECIMAL(10,3),
  uf TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de lotes
CREATE TABLE public.lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  contrato TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(numero, empresa_id)
);

-- Relacionamento muitos-para-muitos entre lotes e rodovias
CREATE TABLE public.lotes_rodovias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID REFERENCES public.lotes(id) ON DELETE CASCADE NOT NULL,
  rodovia_id UUID REFERENCES public.rodovias(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(lote_id, rodovia_id)
);

-- Criar tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Criar enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'coordenador', 'tecnico');

-- Criar tabela de roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Função para verificar role (security definer para evitar recursão em RLS)
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

-- Criar tabela de sessões de trabalho (técnico seleciona lote + rodovia no início do dia)
CREATE TABLE public.sessoes_trabalho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lote_id UUID REFERENCES public.lotes(id) ON DELETE CASCADE NOT NULL,
  rodovia_id UUID REFERENCES public.rodovias(id) ON DELETE CASCADE NOT NULL,
  data_inicio TIMESTAMPTZ DEFAULT now(),
  data_fim TIMESTAMPTZ,
  ativa BOOLEAN DEFAULT true,
  CHECK (data_fim IS NULL OR data_fim > data_inicio)
);

-- Criar tabela de não conformidades (planilha 2.3)
CREATE TABLE public.nao_conformidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  lote_id UUID REFERENCES public.lotes(id) NOT NULL,
  rodovia_id UUID REFERENCES public.rodovias(id) NOT NULL,
  
  -- Dados do formulário
  data_ocorrencia DATE NOT NULL,
  numero_nc TEXT NOT NULL,
  problema TEXT NOT NULL,
  empresa TEXT NOT NULL,
  prazo DATE,
  
  -- Localização GPS (CRÍTICO)
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  km_referencia DECIMAL(10,3),
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- SharePoint
  sincronizado_sharepoint BOOLEAN DEFAULT false,
  data_sincronizacao TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX idx_sessoes_ativa ON public.sessoes_trabalho(user_id, ativa) WHERE ativa = true;
CREATE INDEX idx_nc_lote_rodovia ON public.nao_conformidades(lote_id, rodovia_id);
CREATE INDEX idx_nc_data ON public.nao_conformidades(data_ocorrencia DESC);
CREATE INDEX idx_nc_gps ON public.nao_conformidades(latitude, longitude);

-- RLS Policies

-- Empresas: Admin pode tudo, outros podem ler
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access empresas"
ON public.empresas FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can read empresas"
ON public.empresas FOR SELECT
TO authenticated
USING (true);

-- Rodovias: Admin pode tudo, outros podem ler
ALTER TABLE public.rodovias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access rodovias"
ON public.rodovias FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can read rodovias"
ON public.rodovias FOR SELECT
TO authenticated
USING (true);

-- Lotes: Admin pode tudo, outros podem ler
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access lotes"
ON public.lotes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can read lotes"
ON public.lotes FOR SELECT
TO authenticated
USING (true);

-- Lotes_Rodovias: Admin pode tudo, outros podem ler
ALTER TABLE public.lotes_rodovias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access lotes_rodovias"
ON public.lotes_rodovias FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can read lotes_rodovias"
ON public.lotes_rodovias FOR SELECT
TO authenticated
USING (true);

-- Profiles: Usuários podem ver e editar o próprio perfil
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- User Roles: Admin pode tudo, usuários podem ver próprias roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access user_roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Sessões de Trabalho: Usuários gerenciam suas próprias sessões
ALTER TABLE public.sessoes_trabalho ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sessions"
ON public.sessoes_trabalho FOR ALL
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores can view all sessions"
ON public.sessoes_trabalho FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'coordenador') OR public.has_role(auth.uid(), 'admin'));

-- Não Conformidades: Técnicos inserem, coordenadores e admins veem tudo
ALTER TABLE public.nao_conformidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tecnico can insert nc"
ON public.nao_conformidades FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own nc"
ON public.nao_conformidades FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Coordenador can view all nc"
ON public.nao_conformidades FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'coordenador') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can do anything with nc"
ON public.nao_conformidades FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_nao_conformidades_updated_at
BEFORE UPDATE ON public.nao_conformidades
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
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

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();