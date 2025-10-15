-- Criar tabela para sinalizações de auditoria
CREATE TABLE public.auditoria_sinalizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_elemento TEXT NOT NULL CHECK (tipo_elemento IN ('placas', 'marcas_longitudinais', 'tachas', 'inscricoes', 'cilindros', 'porticos', 'defensas')),
  elemento_id UUID NOT NULL,
  origem TEXT NOT NULL CHECK (origem IN ('necessidade', 'cadastro')),
  tipo_problema TEXT NOT NULL CHECK (tipo_problema IN ('fora_rodovia', 'coordenada_errada', 'duplicata', 'outro')),
  descricao TEXT,
  sinalizado_por UUID NOT NULL,
  sinalizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'resolvido', 'ignorado')),
  resolvido_por UUID,
  resolvido_em TIMESTAMP WITH TIME ZONE,
  observacao_resolucao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auditoria_sinalizacoes ENABLE ROW LEVEL SECURITY;

-- Coordenadores e admins veem todas sinalizacoes
CREATE POLICY "Coordenadores veem todas sinalizacoes"
  ON public.auditoria_sinalizacoes FOR SELECT
  USING (has_role(auth.uid(), 'coordenador') OR has_role(auth.uid(), 'admin'));

-- Usuários veem próprias sinalizações
CREATE POLICY "Usuarios veem proprias sinalizacoes"
  ON public.auditoria_sinalizacoes FOR SELECT
  USING (auth.uid() = sinalizado_por);

-- Usuários criam próprias sinalizações
CREATE POLICY "Usuarios criam sinalizacoes"
  ON public.auditoria_sinalizacoes FOR INSERT
  WITH CHECK (auth.uid() = sinalizado_por);

-- Coordenadores podem atualizar (resolver)
CREATE POLICY "Coordenadores atualizam sinalizacoes"
  ON public.auditoria_sinalizacoes FOR UPDATE
  USING (has_role(auth.uid(), 'coordenador') OR has_role(auth.uid(), 'admin'));

-- Usuários podem deletar próprias sinalizações pendentes
CREATE POLICY "Usuarios deletam proprias sinalizacoes"
  ON public.auditoria_sinalizacoes FOR DELETE
  USING (auth.uid() = sinalizado_por AND status = 'pendente');

-- Índices para performance
CREATE INDEX idx_auditoria_sinalizacoes_elemento 
  ON public.auditoria_sinalizacoes(tipo_elemento, elemento_id);
CREATE INDEX idx_auditoria_sinalizacoes_status 
  ON public.auditoria_sinalizacoes(status);
CREATE INDEX idx_auditoria_sinalizacoes_sinalizado_por 
  ON public.auditoria_sinalizacoes(sinalizado_por);
CREATE INDEX idx_auditoria_sinalizacoes_tipo_problema 
  ON public.auditoria_sinalizacoes(tipo_problema);

-- Trigger para updated_at
CREATE TRIGGER update_auditoria_sinalizacoes_updated_at
  BEFORE UPDATE ON public.auditoria_sinalizacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();