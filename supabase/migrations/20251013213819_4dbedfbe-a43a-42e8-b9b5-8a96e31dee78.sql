-- Tabela para elementos pendentes de aprovação
CREATE TABLE elementos_pendentes_aprovacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tipo de elemento
  tipo_elemento TEXT NOT NULL CHECK (tipo_elemento IN (
    'marcas_longitudinais',
    'placas',
    'tachas',
    'inscricoes',
    'cilindros',
    'porticos',
    'defensas'
  )),
  
  -- Localização
  rodovia_id UUID NOT NULL REFERENCES rodovias(id),
  lote_id UUID NOT NULL REFERENCES lotes(id),
  
  -- Dados flexíveis do elemento
  dados_elemento JSONB NOT NULL,
  justificativa TEXT NOT NULL,
  fotos_urls TEXT[] DEFAULT '{}',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pendente_aprovacao' CHECK (status IN (
    'pendente_aprovacao',
    'aprovado',
    'rejeitado'
  )),
  
  -- Aprovação
  coordenador_id UUID REFERENCES auth.users(id),
  data_decisao TIMESTAMP WITH TIME ZONE,
  observacao_coordenador TEXT,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_elementos_pendentes_status ON elementos_pendentes_aprovacao(status);
CREATE INDEX idx_elementos_pendentes_tipo ON elementos_pendentes_aprovacao(tipo_elemento);
CREATE INDEX idx_elementos_pendentes_user ON elementos_pendentes_aprovacao(user_id);

-- RLS Policies
ALTER TABLE elementos_pendentes_aprovacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprios registros"
  ON elementos_pendentes_aprovacao FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores veem todos"
  ON elementos_pendentes_aprovacao FOR SELECT
  USING (
    has_role(auth.uid(), 'coordenador'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Usuários criam próprios registros"
  ON elementos_pendentes_aprovacao FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coordenadores atualizam"
  ON elementos_pendentes_aprovacao FOR UPDATE
  USING (
    has_role(auth.uid(), 'coordenador'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Adicionar coluna 'origem' nas tabelas de inventário
ALTER TABLE ficha_marcas_longitudinais 
  ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'cadastro_inicial'
  CHECK (origem IN ('cadastro_inicial', 'necessidade_campo', 'importacao'));

ALTER TABLE ficha_placa 
  ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'cadastro_inicial'
  CHECK (origem IN ('cadastro_inicial', 'necessidade_campo', 'importacao'));

ALTER TABLE ficha_tachas 
  ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'cadastro_inicial'
  CHECK (origem IN ('cadastro_inicial', 'necessidade_campo', 'importacao'));

ALTER TABLE ficha_inscricoes 
  ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'cadastro_inicial'
  CHECK (origem IN ('cadastro_inicial', 'necessidade_campo', 'importacao'));

ALTER TABLE ficha_cilindros 
  ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'cadastro_inicial'
  CHECK (origem IN ('cadastro_inicial', 'necessidade_campo', 'importacao'));

ALTER TABLE ficha_porticos 
  ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'cadastro_inicial'
  CHECK (origem IN ('cadastro_inicial', 'necessidade_campo', 'importacao'));

ALTER TABLE defensas 
  ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'cadastro_inicial'
  CHECK (origem IN ('cadastro_inicial', 'necessidade_campo', 'importacao'));