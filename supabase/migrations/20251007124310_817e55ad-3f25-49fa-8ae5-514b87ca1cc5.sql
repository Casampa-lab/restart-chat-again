-- Adicionar coluna empresa_id à tabela profiles
ALTER TABLE public.profiles
ADD COLUMN empresa_id UUID REFERENCES public.empresas(id);

-- Criar enum para tipos de plano
CREATE TYPE public.plan_tier AS ENUM ('basico', 'profissional', 'enterprise');

-- Criar enum para status de assinatura
CREATE TYPE public.subscription_status AS ENUM ('ativa', 'suspensa', 'cancelada', 'trial');

-- Tabela de módulos disponíveis
CREATE TABLE public.modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  icone TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de planos
CREATE TABLE public.planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier plan_tier NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  max_modulos INTEGER,
  max_usuarios INTEGER,
  preco_mensal NUMERIC(10,2),
  recursos JSONB DEFAULT '[]'::jsonb,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de assinaturas das empresas
CREATE TABLE public.assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  plano_id UUID REFERENCES public.planos(id) NOT NULL,
  status subscription_status DEFAULT 'trial',
  data_inicio TIMESTAMPTZ DEFAULT now(),
  data_fim TIMESTAMPTZ,
  trial_ate TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_id)
);

-- Tabela de módulos ativos por assinatura
CREATE TABLE public.assinatura_modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assinatura_id UUID REFERENCES public.assinaturas(id) ON DELETE CASCADE NOT NULL,
  modulo_id UUID REFERENCES public.modulos(id) ON DELETE CASCADE NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assinatura_id, modulo_id)
);

-- Enable RLS
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinatura_modulos ENABLE ROW LEVEL SECURITY;

-- RLS Policies para módulos (todos podem ver os disponíveis)
CREATE POLICY "Módulos são visíveis para todos autenticados"
  ON public.modulos FOR SELECT
  TO authenticated
  USING (ativo = true);

CREATE POLICY "Apenas admins podem gerenciar módulos"
  ON public.modulos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para planos (todos podem ver)
CREATE POLICY "Planos são visíveis para todos autenticados"
  ON public.planos FOR SELECT
  TO authenticated
  USING (ativo = true);

CREATE POLICY "Apenas admins podem gerenciar planos"
  ON public.planos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para assinaturas
CREATE POLICY "Usuários veem assinatura da própria empresa"
  ON public.assinaturas FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Apenas admins podem gerenciar assinaturas"
  ON public.assinaturas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para módulos da assinatura
CREATE POLICY "Usuários veem módulos da própria assinatura"
  ON public.assinatura_modulos FOR SELECT
  TO authenticated
  USING (
    assinatura_id IN (
      SELECT a.id FROM public.assinaturas a
      INNER JOIN public.profiles p ON p.empresa_id = a.empresa_id
      WHERE p.id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Apenas admins podem gerenciar módulos de assinatura"
  ON public.assinatura_modulos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Triggers para updated_at
CREATE TRIGGER update_modulos_updated_at BEFORE UPDATE ON public.modulos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planos_updated_at BEFORE UPDATE ON public.planos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assinaturas_updated_at BEFORE UPDATE ON public.assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir planos padrão
INSERT INTO public.planos (tier, nome, descricao, max_modulos, max_usuarios, preco_mensal, recursos) VALUES
('basico', 'Básico', 'Plano inicial para pequenas operações', 1, 5, 299.00, '["Login/Autenticação", "1 módulo à escolha", "5 usuários", "Suporte por email"]'::jsonb),
('profissional', 'Profissional', 'Plano completo para operações médias', 3, NULL, 899.00, '["Login/Autenticação", "Até 3 módulos", "Usuários ilimitados", "Relatórios básicos", "Suporte prioritário"]'::jsonb),
('enterprise', 'Enterprise', 'Solução completa para grandes operações', NULL, NULL, 1999.00, '["Todos os módulos", "Usuários ilimitados", "Dashboard consolidado", "API/Integrações", "Relatórios avançados", "Suporte 24/7"]'::jsonb);

-- Inserir módulos disponíveis (genéricos)
INSERT INTO public.modulos (codigo, nome, descricao, icone, ordem) VALUES
('sinalizacao', 'Sinalização Rodoviária', 'Gestão completa de sinalização horizontal e vertical', 'Route', 1),
('pavimentacao', 'Pavimentação', 'Controle de qualidade e manutenção de pavimentos', 'Construction', 2),
('obras-arte', 'Obras de Arte', 'Gestão de pontes, viadutos e obras especiais', 'Bridge', 3),
('manutencao', 'Manutenção Rodoviária', 'Registro e acompanhamento de manutenções', 'Wrench', 4),
('dashboards', 'Dashboards Avançados', 'Análises e visualizações consolidadas', 'BarChart3', 5),
('relatorios', 'Relatórios Customizados', 'Geração de relatórios personalizados', 'FileText', 6);

-- Função para verificar se usuário tem acesso a um módulo
CREATE OR REPLACE FUNCTION public.user_has_module_access(_user_id uuid, _modulo_codigo text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assinaturas a
    INNER JOIN public.profiles p ON p.empresa_id = a.empresa_id
    INNER JOIN public.assinatura_modulos am ON am.assinatura_id = a.id
    INNER JOIN public.modulos m ON m.id = am.modulo_id
    WHERE p.id = _user_id
      AND m.codigo = _modulo_codigo
      AND a.status = 'ativa'
      AND am.ativo = true
  ) OR public.has_role(_user_id, 'admin')
$$;