-- Migration: Migrar fotos de foto_frontal_url para fotos_urls
-- Data: 2025-01-19
-- Motivo: Compatibilizar com Inventário Dinâmico e garantir histórico correto

-- Migrar fotos existentes para o campo padrão
UPDATE ficha_placa
SET 
  fotos_urls = ARRAY[foto_frontal_url],
  origem = COALESCE(origem, 'cadastro_inicial')
WHERE foto_frontal_url IS NOT NULL
  AND foto_frontal_url != ''
  AND (fotos_urls IS NULL OR array_length(fotos_urls, 1) = 0);

-- Log da migração
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM ficha_placa
  WHERE fotos_urls IS NOT NULL 
    AND array_length(fotos_urls, 1) > 0;
  
  RAISE NOTICE 'Migração concluída: % placas agora possuem fotos_urls populado', v_count;
END $$;