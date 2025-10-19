-- FASE 1: Estrutura do Banco de Dados para Sistema de Validação de Fichas de Verificação

-- Adicionar colunas para armazenar medições individuais de retrorefletividade (SH)
ALTER TABLE ficha_verificacao_itens
  ADD COLUMN IF NOT EXISTS retro_bd_medicoes jsonb,
  ADD COLUMN IF NOT EXISTS retro_e_medicoes jsonb,
  ADD COLUMN IF NOT EXISTS retro_be_medicoes jsonb;

-- Adicionar colunas de controle de status e validação para fichas SH
ALTER TABLE ficha_verificacao
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'rascunho',
  ADD COLUMN IF NOT EXISTS enviado_coordenador_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS aprovado_coordenador_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS rejeitado_coordenador_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS coordenador_id uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS observacao_coordenador text;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_ficha_verificacao_status ON ficha_verificacao(status);

-- RLS Policies para coordenadores visualizarem fichas SH
CREATE POLICY "Coordenadores veem todas fichas SH"
  ON ficha_verificacao FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'coordenador') OR 
    has_role(auth.uid(), 'admin')
  );

-- RLS Policies para coordenadores atualizarem fichas SH
CREATE POLICY "Coordenadores atualizam status fichas SH"
  ON ficha_verificacao FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'coordenador') OR 
    has_role(auth.uid(), 'admin')
  );