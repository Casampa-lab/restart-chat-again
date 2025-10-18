-- Adicionar coluna para controlar exibição do logo do órgão nos relatórios
ALTER TABLE supervisoras 
ADD COLUMN IF NOT EXISTS usar_logo_orgao_relatorios boolean DEFAULT true;

-- Atualizar registros existentes: se tem logo do órgão, ativar por padrão
UPDATE supervisoras 
SET usar_logo_orgao_relatorios = true 
WHERE logo_orgao_fiscalizador_url IS NOT NULL;

COMMENT ON COLUMN supervisoras.usar_logo_orgao_relatorios IS 'Controla se o logo do órgão fiscalizador aparece nos relatórios Excel/PDF';