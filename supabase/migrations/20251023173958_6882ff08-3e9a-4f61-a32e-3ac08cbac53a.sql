-- Adicionar campos de conflito em todas as tabelas de necessidades
-- Campos para rastrear conflitos de serviço (ex: IMPLANTAR + REMOVER no mesmo lugar)

-- necessidades_placas
ALTER TABLE necessidades_placas
ADD COLUMN tem_conflito_servico boolean DEFAULT false,
ADD COLUMN tipo_conflito text,
ADD COLUMN conflito_com_necessidade_id uuid REFERENCES necessidades_placas(id),
ADD COLUMN conflito_detalhes jsonb,
ADD COLUMN observacao_conflito text;

CREATE INDEX idx_necessidades_placas_conflito 
ON necessidades_placas(tem_conflito_servico) 
WHERE tem_conflito_servico = true;

-- necessidades_porticos
ALTER TABLE necessidades_porticos
ADD COLUMN tem_conflito_servico boolean DEFAULT false,
ADD COLUMN tipo_conflito text,
ADD COLUMN conflito_com_necessidade_id uuid REFERENCES necessidades_porticos(id),
ADD COLUMN conflito_detalhes jsonb,
ADD COLUMN observacao_conflito text;

CREATE INDEX idx_necessidades_porticos_conflito 
ON necessidades_porticos(tem_conflito_servico) 
WHERE tem_conflito_servico = true;

-- necessidades_marcas_transversais (inscrições)
ALTER TABLE necessidades_marcas_transversais
ADD COLUMN tem_conflito_servico boolean DEFAULT false,
ADD COLUMN tipo_conflito text,
ADD COLUMN conflito_com_necessidade_id uuid REFERENCES necessidades_marcas_transversais(id),
ADD COLUMN conflito_detalhes jsonb,
ADD COLUMN observacao_conflito text;

CREATE INDEX idx_necessidades_marcas_transversais_conflito 
ON necessidades_marcas_transversais(tem_conflito_servico) 
WHERE tem_conflito_servico = true;

-- necessidades_cilindros
ALTER TABLE necessidades_cilindros
ADD COLUMN tem_conflito_servico boolean DEFAULT false,
ADD COLUMN tipo_conflito text,
ADD COLUMN conflito_com_necessidade_id uuid REFERENCES necessidades_cilindros(id),
ADD COLUMN conflito_detalhes jsonb,
ADD COLUMN observacao_conflito text;

CREATE INDEX idx_necessidades_cilindros_conflito 
ON necessidades_cilindros(tem_conflito_servico) 
WHERE tem_conflito_servico = true;

-- necessidades_marcas_longitudinais
ALTER TABLE necessidades_marcas_longitudinais
ADD COLUMN tem_conflito_servico boolean DEFAULT false,
ADD COLUMN tipo_conflito text,
ADD COLUMN conflito_com_necessidade_id uuid REFERENCES necessidades_marcas_longitudinais(id),
ADD COLUMN conflito_detalhes jsonb,
ADD COLUMN observacao_conflito text;

CREATE INDEX idx_necessidades_marcas_longitudinais_conflito 
ON necessidades_marcas_longitudinais(tem_conflito_servico) 
WHERE tem_conflito_servico = true;

-- necessidades_tachas
ALTER TABLE necessidades_tachas
ADD COLUMN tem_conflito_servico boolean DEFAULT false,
ADD COLUMN tipo_conflito text,
ADD COLUMN conflito_com_necessidade_id uuid REFERENCES necessidades_tachas(id),
ADD COLUMN conflito_detalhes jsonb,
ADD COLUMN observacao_conflito text;

CREATE INDEX idx_necessidades_tachas_conflito 
ON necessidades_tachas(tem_conflito_servico) 
WHERE tem_conflito_servico = true;

-- necessidades_defensas
ALTER TABLE necessidades_defensas
ADD COLUMN tem_conflito_servico boolean DEFAULT false,
ADD COLUMN tipo_conflito text,
ADD COLUMN conflito_com_necessidade_id uuid REFERENCES necessidades_defensas(id),
ADD COLUMN conflito_detalhes jsonb,
ADD COLUMN observacao_conflito text;

CREATE INDEX idx_necessidades_defensas_conflito 
ON necessidades_defensas(tem_conflito_servico) 
WHERE tem_conflito_servico = true;

-- Comentários explicativos
COMMENT ON COLUMN necessidades_placas.tem_conflito_servico IS 'Indica se há conflito de serviço (ex: IMPLANTAR + REMOVER no mesmo local)';
COMMENT ON COLUMN necessidades_placas.tipo_conflito IS 'Tipo do conflito: SERVICO_CONTRADICTORIO, DUPLICATA_PROJETO, etc';
COMMENT ON COLUMN necessidades_placas.conflito_detalhes IS 'JSON com detalhes do conflito: linhas Excel, serviços envolvidos, etc';
COMMENT ON COLUMN necessidades_placas.observacao_conflito IS 'Observação sobre resolução do conflito';