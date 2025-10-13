-- Adicionar campos para marcar serviços fora do plano de manutenção em todas as tabelas de intervenções

-- Intervenções SH (Sinalização Horizontal)
ALTER TABLE intervencoes_sh 
ADD COLUMN IF NOT EXISTS fora_plano_manutencao BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS justificativa_fora_plano TEXT;

-- Intervenções Inscrições
ALTER TABLE intervencoes_inscricoes 
ADD COLUMN IF NOT EXISTS fora_plano_manutencao BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS justificativa_fora_plano TEXT;

-- Intervenções SV (Sinalização Vertical)
ALTER TABLE intervencoes_sv 
ADD COLUMN IF NOT EXISTS fora_plano_manutencao BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS justificativa_fora_plano TEXT;

-- Intervenções Tacha
ALTER TABLE intervencoes_tacha 
ADD COLUMN IF NOT EXISTS fora_plano_manutencao BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS justificativa_fora_plano TEXT;

-- Marcas Longitudinais Intervenções
ALTER TABLE ficha_marcas_longitudinais_intervencoes
ADD COLUMN IF NOT EXISTS fora_plano_manutencao BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS justificativa_fora_plano TEXT;

-- Cilindros Intervenções
ALTER TABLE ficha_cilindros_intervencoes
ADD COLUMN IF NOT EXISTS fora_plano_manutencao BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS justificativa_fora_plano TEXT;

-- Pórticos Intervenções
ALTER TABLE ficha_porticos_intervencoes
ADD COLUMN IF NOT EXISTS fora_plano_manutencao BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS justificativa_fora_plano TEXT;

-- Defensas Intervenções
ALTER TABLE defensas_intervencoes
ADD COLUMN IF NOT EXISTS fora_plano_manutencao BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS justificativa_fora_plano TEXT;

-- Inscrições Intervenções
ALTER TABLE ficha_inscricoes_intervencoes
ADD COLUMN IF NOT EXISTS fora_plano_manutencao BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS justificativa_fora_plano TEXT;

-- Tachas Intervenções
ALTER TABLE ficha_tachas_intervencoes
ADD COLUMN IF NOT EXISTS fora_plano_manutencao BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS justificativa_fora_plano TEXT;

-- Placas Intervenções
ALTER TABLE ficha_placa_intervencoes
ADD COLUMN IF NOT EXISTS fora_plano_manutencao BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS justificativa_fora_plano TEXT;

COMMENT ON COLUMN intervencoes_sh.fora_plano_manutencao IS 'Indica se o serviço foi executado fora do plano de manutenção aprovado';
COMMENT ON COLUMN intervencoes_sh.justificativa_fora_plano IS 'Justificativa para execução do serviço fora do plano';