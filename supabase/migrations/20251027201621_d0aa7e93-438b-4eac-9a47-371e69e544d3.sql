-- Remover campos depreciados de ficha_cilindros_intervencoes
ALTER TABLE ficha_cilindros_intervencoes 
  DROP COLUMN IF EXISTS fora_plano_manutencao,
  DROP COLUMN IF EXISTS justificativa_fora_plano;

-- Adicionar comentário explicativo
COMMENT ON TABLE ficha_cilindros_intervencoes IS 
  'Intervenções em cilindros delimitadores. Campos fora_plano_manutencao e justificativa_fora_plano foram removidos em 2025-10-27 por estarem em desuso.';