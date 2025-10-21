-- Tarefa 1: Taxonomia e Parâmetros por Tipo

-- Criar tipos enum
CREATE TYPE classe_elemento_enum AS ENUM ('PONTUAL', 'LINEAR');

CREATE TYPE tipo_elemento_enum AS ENUM (
  'PLACA',
  'PORTICO', 
  'INSCRICAO',
  'MARCA_LONG',
  'TACHAS',
  'DEFENSA',
  'CILINDRO'
);

-- Criar tabela de parâmetros
CREATE TABLE public.param_tolerancias_match (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Classificação
  classe classe_elemento_enum NOT NULL,
  tipo tipo_elemento_enum NOT NULL UNIQUE,
  
  -- Tolerâncias para PONTUAIS (metros)
  tol_dist_m NUMERIC,
  tol_dist_substituicao_m NUMERIC,
  
  -- Tolerâncias para LINEARES (overlap ratio 0-1)
  tol_overlap_match NUMERIC CHECK (tol_overlap_match BETWEEN 0 AND 1),
  tol_overlap_amb_low NUMERIC CHECK (tol_overlap_amb_low BETWEEN 0 AND 1),
  tol_overlap_amb_high NUMERIC CHECK (tol_overlap_amb_high BETWEEN 0 AND 1),
  
  -- Atributos obrigatórios para match (JSON array)
  atributos_match JSONB DEFAULT '[]'::jsonb,
  
  -- Metadados
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints lógicos
  CHECK (
    (classe = 'PONTUAL' AND tol_dist_m IS NOT NULL) OR
    (classe = 'LINEAR' AND tol_overlap_match IS NOT NULL)
  )
);

-- Seed inicial - PONTUAIS
INSERT INTO public.param_tolerancias_match (classe, tipo, tol_dist_m, tol_dist_substituicao_m, atributos_match, descricao) VALUES
  ('PONTUAL', 'PLACA', 15, 30, '["codigo", "lado"]', 'Placas de sinalização vertical'),
  ('PONTUAL', 'PORTICO', 80, 150, '["tipo"]', 'Pórticos e semipórticos'),
  ('PONTUAL', 'INSCRICAO', 12, 25, '["sigla", "tipo_inscricao"]', 'Inscrições e setas transversais');

-- Seed inicial - LINEARES
INSERT INTO public.param_tolerancias_match (classe, tipo, tol_overlap_match, tol_overlap_amb_low, tol_overlap_amb_high, atributos_match, descricao) VALUES
  ('LINEAR', 'MARCA_LONG', 0.30, 0.10, 0.30, '["tipo_demarcacao", "cor", "lado"]', 'Marcas longitudinais'),
  ('LINEAR', 'TACHAS', 0.30, 0.10, 0.30, '["corpo", "cor_refletivo"]', 'Tachas refletivas'),
  ('LINEAR', 'DEFENSA', 0.25, 0.10, 0.25, '["funcao", "lado"]', 'Defensas metálicas'),
  ('LINEAR', 'CILINDRO', 0.25, 0.10, 0.25, '["cor_corpo", "local_implantacao"]', 'Cilindros delimitadores');

-- Índices
CREATE INDEX idx_param_tolerancias_tipo ON param_tolerancias_match(tipo);
CREATE INDEX idx_param_tolerancias_ativo ON param_tolerancias_match(ativo) WHERE ativo = TRUE;

-- Trigger para updated_at
CREATE TRIGGER update_param_tolerancias_updated_at
  BEFORE UPDATE ON param_tolerancias_match
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE param_tolerancias_match ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ler parametros ativos"
  ON param_tolerancias_match FOR SELECT
  USING (ativo = TRUE);

CREATE POLICY "Apenas admins editam parametros"
  ON param_tolerancias_match FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Comentários
COMMENT ON TABLE param_tolerancias_match IS 'Parâmetros de matching diferenciados por tipo de elemento';
COMMENT ON COLUMN param_tolerancias_match.tol_dist_m IS 'Distância máxima (m) para match direto em elementos pontuais';
COMMENT ON COLUMN param_tolerancias_match.tol_overlap_match IS 'Overlap mínimo (0-1) para match direto em elementos lineares';
COMMENT ON COLUMN param_tolerancias_match.tol_overlap_amb_low IS 'Limite inferior da faixa ambígua (overlap duvidoso)';
COMMENT ON COLUMN param_tolerancias_match.atributos_match IS 'Lista de atributos obrigatórios para comparação (JSON array)';