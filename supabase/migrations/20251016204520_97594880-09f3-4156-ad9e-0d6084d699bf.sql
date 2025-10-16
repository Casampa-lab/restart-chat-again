-- Criar tabela de notificações in-app
CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN DEFAULT FALSE,
  elemento_pendente_id UUID REFERENCES elementos_pendentes_aprovacao(id),
  nc_id UUID REFERENCES nao_conformidades(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios veem proprias notificacoes"
ON public.notificacoes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuarios atualizam proprias notificacoes"
ON public.notificacoes FOR UPDATE
USING (auth.uid() = user_id);

-- Sistema pode inserir notificações
CREATE POLICY "Sistema cria notificacoes"
ON public.notificacoes FOR INSERT
WITH CHECK (true);

-- Index para performance
CREATE INDEX idx_notificacoes_user_lida ON notificacoes(user_id, lida);
CREATE INDEX idx_notificacoes_created_at ON notificacoes(created_at DESC);