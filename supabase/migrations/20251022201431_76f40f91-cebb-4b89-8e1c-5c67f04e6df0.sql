-- ============================================================================
-- CORREÇÃO DEFINITIVA: Sincronizar cadastro_match_id + Trigger de Consistência
-- ============================================================================

-- ETAPA 1: Forçar atualização de registros inconsistentes
UPDATE necessidades_cilindros
SET 
  cadastro_match_id = cadastro_id,
  updated_at = now()
WHERE cadastro_id IS NOT NULL
  AND cadastro_match_id IS NULL
  AND match_decision IN ('MATCH_DIRECT', 'SUBSTITUICAO');

-- ETAPA 2: Criar função do trigger
CREATE OR REPLACE FUNCTION sync_cadastro_match_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Se tem cadastro_id e decisão de match confirmado, sincronizar cadastro_match_id
  IF NEW.cadastro_id IS NOT NULL 
     AND NEW.match_decision IN ('MATCH_DIRECT', 'SUBSTITUICAO')
     AND NEW.cadastro_match_id IS NULL 
  THEN
    NEW.cadastro_match_id := NEW.cadastro_id;
    RAISE NOTICE 'Auto-sync: cadastro_match_id definido como % para necessidade %', NEW.cadastro_id, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ETAPA 3: Criar trigger
DROP TRIGGER IF EXISTS trg_sync_cadastro_match_id ON necessidades_cilindros;

CREATE TRIGGER trg_sync_cadastro_match_id
  BEFORE INSERT OR UPDATE ON necessidades_cilindros
  FOR EACH ROW
  EXECUTE FUNCTION sync_cadastro_match_id();

-- ETAPA 4: Validação final
DO $$
DECLARE
  inconsistentes INTEGER;
BEGIN
  SELECT COUNT(*) INTO inconsistentes
  FROM necessidades_cilindros
  WHERE cadastro_id IS NOT NULL
    AND cadastro_match_id IS NULL
    AND match_decision IN ('MATCH_DIRECT', 'SUBSTITUICAO');
  
  IF inconsistentes > 0 THEN
    RAISE WARNING 'Ainda existem % registros inconsistentes!', inconsistentes;
  ELSE
    RAISE NOTICE '✅ Todos os registros estão consistentes! cadastro_match_id sincronizado.';
  END IF;
END $$;

-- Comentários
COMMENT ON FUNCTION sync_cadastro_match_id() IS 
  'Garante que cadastro_match_id sempre reflita cadastro_id quando houver match confirmado';

COMMENT ON TRIGGER trg_sync_cadastro_match_id ON necessidades_cilindros IS 
  'Sincroniza automaticamente cadastro_match_id com cadastro_id para matches confirmados';