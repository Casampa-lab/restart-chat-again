-- Criar tabela para configurações do sistema
CREATE TABLE IF NOT EXISTS public.configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS policies
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar configurações
CREATE POLICY "Admin full access configuracoes"
  ON public.configuracoes
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Usuários autenticados podem ler configurações
CREATE POLICY "Authenticated users can read configuracoes"
  ON public.configuracoes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);