-- Criar enums para tipos
CREATE TYPE tipo_elemento_reconciliacao AS ENUM (
  'placas',
  'defensas', 
  'porticos',
  'marcas_longitudinais',
  'inscricoes',
  'cilindros',
  'tachas'
);

CREATE TYPE status_reconciliacao_enum AS ENUM (
  'pendente_aprovacao',
  'aprovado',
  'rejeitado'
);

-- Criar tabela reconciliacoes
CREATE TABLE public.reconciliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação do match
  tipo_elemento tipo_elemento_reconciliacao NOT NULL,
  necessidade_id UUID NOT NULL,
  cadastro_id UUID,
  
  -- Dados do matching GPS
  distancia_match_metros NUMERIC,
  overlap_porcentagem NUMERIC,
  tipo_match TEXT,
  
  -- Status da reconciliação
  status status_reconciliacao_enum NOT NULL DEFAULT 'pendente_aprovacao',
  reconciliado BOOLEAN DEFAULT FALSE,
  
  -- Auditoria: Solicitação
  solicitado_por UUID REFERENCES auth.users(id),
  solicitado_em TIMESTAMPTZ,
  observacao_usuario TEXT,
  
  -- Auditoria: Aprovação
  aprovado_por UUID REFERENCES auth.users(id),
  aprovado_em TIMESTAMPTZ,
  observacao_coordenador TEXT,
  
  -- Auditoria: Rejeição
  rejeitado_por UUID REFERENCES auth.users(id),
  rejeitado_em TIMESTAMPTZ,
  motivo_rejeicao TEXT,
  
  -- Outros
  motivo_revisao TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: necessidade pode ter apenas uma reconciliação
  UNIQUE (tipo_elemento, necessidade_id)
);

-- Índices para performance
CREATE INDEX idx_reconciliacoes_status ON reconciliacoes(status);
CREATE INDEX idx_reconciliacoes_tipo_elemento ON reconciliacoes(tipo_elemento);
CREATE INDEX idx_reconciliacoes_necessidade ON reconciliacoes(necessidade_id);
CREATE INDEX idx_reconciliacoes_cadastro ON reconciliacoes(cadastro_id);
CREATE INDEX idx_reconciliacoes_pendentes ON reconciliacoes(status) WHERE status = 'pendente_aprovacao';

-- Trigger para updated_at
CREATE TRIGGER update_reconciliacoes_updated_at
  BEFORE UPDATE ON reconciliacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE reconciliacoes ENABLE ROW LEVEL SECURITY;

-- Coordenadores e admins veem tudo
CREATE POLICY "Coordenadores veem todas reconciliacoes"
  ON reconciliacoes FOR SELECT
  USING (has_role(auth.uid(), 'coordenador') OR has_role(auth.uid(), 'admin'));

-- Usuários veem apenas as que solicitaram
CREATE POLICY "Usuarios veem proprias reconciliacoes"
  ON reconciliacoes FOR SELECT
  USING (auth.uid() = solicitado_por);

-- Usuários e sistema podem criar reconciliações
CREATE POLICY "Usuarios criam reconciliacoes"
  ON reconciliacoes FOR INSERT
  WITH CHECK (true);

-- Coordenadores atualizam
CREATE POLICY "Coordenadores atualizam reconciliacoes"
  ON reconciliacoes FOR UPDATE
  USING (has_role(auth.uid(), 'coordenador') OR has_role(auth.uid(), 'admin'));

-- Coordenadores deletam
CREATE POLICY "Coordenadores deletam reconciliacoes"
  ON reconciliacoes FOR DELETE
  USING (has_role(auth.uid(), 'coordenador') OR has_role(auth.uid(), 'admin'));