-- Dropar colunas redundantes de necessidades_placas
ALTER TABLE necessidades_placas 
  DROP COLUMN IF EXISTS status_reconciliacao,
  DROP COLUMN IF EXISTS reconciliado,
  DROP COLUMN IF EXISTS distancia_match_metros,
  DROP COLUMN IF EXISTS overlap_porcentagem,
  DROP COLUMN IF EXISTS tipo_match,
  DROP COLUMN IF EXISTS motivo_revisao,
  DROP COLUMN IF EXISTS aprovado_por,
  DROP COLUMN IF EXISTS aprovado_em,
  DROP COLUMN IF EXISTS observacao_coordenador;

-- Dropar colunas redundantes de necessidades_defensas
ALTER TABLE necessidades_defensas 
  DROP COLUMN IF EXISTS status_reconciliacao,
  DROP COLUMN IF EXISTS reconciliado,
  DROP COLUMN IF EXISTS distancia_match_metros,
  DROP COLUMN IF EXISTS overlap_porcentagem,
  DROP COLUMN IF EXISTS tipo_match,
  DROP COLUMN IF EXISTS motivo_revisao,
  DROP COLUMN IF EXISTS aprovado_por,
  DROP COLUMN IF EXISTS aprovado_em,
  DROP COLUMN IF EXISTS observacao_coordenador;

-- Dropar colunas redundantes de necessidades_porticos
ALTER TABLE necessidades_porticos 
  DROP COLUMN IF EXISTS status_reconciliacao,
  DROP COLUMN IF EXISTS reconciliado,
  DROP COLUMN IF EXISTS distancia_match_metros,
  DROP COLUMN IF EXISTS overlap_porcentagem,
  DROP COLUMN IF EXISTS tipo_match,
  DROP COLUMN IF EXISTS motivo_revisao,
  DROP COLUMN IF EXISTS aprovado_por,
  DROP COLUMN IF EXISTS aprovado_em,
  DROP COLUMN IF EXISTS observacao_coordenador;

-- Dropar colunas redundantes de necessidades_marcas_longitudinais
ALTER TABLE necessidades_marcas_longitudinais 
  DROP COLUMN IF EXISTS status_reconciliacao,
  DROP COLUMN IF EXISTS reconciliado,
  DROP COLUMN IF EXISTS distancia_match_metros,
  DROP COLUMN IF EXISTS overlap_porcentagem,
  DROP COLUMN IF EXISTS tipo_match,
  DROP COLUMN IF EXISTS motivo_revisao,
  DROP COLUMN IF EXISTS aprovado_por,
  DROP COLUMN IF EXISTS aprovado_em,
  DROP COLUMN IF EXISTS observacao_coordenador;

-- Dropar colunas redundantes de necessidades_marcas_transversais
ALTER TABLE necessidades_marcas_transversais 
  DROP COLUMN IF EXISTS status_reconciliacao,
  DROP COLUMN IF EXISTS reconciliado,
  DROP COLUMN IF EXISTS distancia_match_metros,
  DROP COLUMN IF EXISTS overlap_porcentagem,
  DROP COLUMN IF EXISTS tipo_match,
  DROP COLUMN IF EXISTS motivo_revisao,
  DROP COLUMN IF EXISTS aprovado_por,
  DROP COLUMN IF EXISTS aprovado_em,
  DROP COLUMN IF EXISTS observacao_coordenador;

-- Dropar colunas redundantes de necessidades_cilindros
ALTER TABLE necessidades_cilindros 
  DROP COLUMN IF EXISTS status_reconciliacao,
  DROP COLUMN IF EXISTS reconciliado,
  DROP COLUMN IF EXISTS distancia_match_metros,
  DROP COLUMN IF EXISTS overlap_porcentagem,
  DROP COLUMN IF EXISTS tipo_match,
  DROP COLUMN IF EXISTS motivo_revisao,
  DROP COLUMN IF EXISTS aprovado_por,
  DROP COLUMN IF EXISTS aprovado_em,
  DROP COLUMN IF EXISTS observacao_coordenador;

-- Dropar colunas redundantes de necessidades_tachas
ALTER TABLE necessidades_tachas 
  DROP COLUMN IF EXISTS status_reconciliacao,
  DROP COLUMN IF EXISTS reconciliado,
  DROP COLUMN IF EXISTS distancia_match_metros,
  DROP COLUMN IF EXISTS overlap_porcentagem,
  DROP COLUMN IF EXISTS tipo_match,
  DROP COLUMN IF EXISTS motivo_revisao,
  DROP COLUMN IF EXISTS aprovado_por,
  DROP COLUMN IF EXISTS aprovado_em,
  DROP COLUMN IF EXISTS observacao_coordenador;