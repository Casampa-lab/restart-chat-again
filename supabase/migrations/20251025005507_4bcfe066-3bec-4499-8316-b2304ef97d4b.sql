-- Migration: Criar FKs ficha_verificacao → rodovias e lotes

-- 1) Verificar órfãos em rodovia_id
DO $$
DECLARE
  orfaos_rodovia INTEGER;
BEGIN
  SELECT COUNT(*) INTO orfaos_rodovia
  FROM public.ficha_verificacao fv
  LEFT JOIN public.rodovias r ON r.id = fv.rodovia_id
  WHERE fv.rodovia_id IS NOT NULL AND r.id IS NULL;
  
  IF orfaos_rodovia > 0 THEN
    RAISE EXCEPTION '❌ Existem % fichas com rodovia_id órfão!', orfaos_rodovia;
  ELSE
    RAISE NOTICE '✅ Nenhum órfão em rodovia_id';
  END IF;
END $$;

-- 2) Verificar órfãos em lote_id
DO $$
DECLARE
  orfaos_lote INTEGER;
BEGIN
  SELECT COUNT(*) INTO orfaos_lote
  FROM public.ficha_verificacao fv
  LEFT JOIN public.lotes l ON l.id = fv.lote_id
  WHERE fv.lote_id IS NOT NULL AND l.id IS NULL;
  
  IF orfaos_lote > 0 THEN
    RAISE EXCEPTION '❌ Existem % fichas com lote_id órfão!', orfaos_lote;
  ELSE
    RAISE NOTICE '✅ Nenhum órfão em lote_id';
  END IF;
END $$;

-- 3) Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_ficha_verificacao_rodovia_id
  ON public.ficha_verificacao(rodovia_id);

CREATE INDEX IF NOT EXISTS idx_ficha_verificacao_lote_id
  ON public.ficha_verificacao(lote_id);

-- 4) Criar Foreign Key para rodovia_id
ALTER TABLE public.ficha_verificacao
  ADD CONSTRAINT ficha_verificacao_rodovia_id_fkey
  FOREIGN KEY (rodovia_id) 
  REFERENCES public.rodovias(id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

-- 5) Criar Foreign Key para lote_id
ALTER TABLE public.ficha_verificacao
  ADD CONSTRAINT ficha_verificacao_lote_id_fkey
  FOREIGN KEY (lote_id) 
  REFERENCES public.lotes(id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

-- 6) Comentários para documentação
COMMENT ON CONSTRAINT ficha_verificacao_rodovia_id_fkey 
  ON public.ficha_verificacao IS
  'Garante integridade entre ficha_verificacao.rodovia_id e rodovias.id';

COMMENT ON CONSTRAINT ficha_verificacao_lote_id_fkey 
  ON public.ficha_verificacao IS
  'Garante integridade entre ficha_verificacao.lote_id e lotes.id';

-- 7) Verificação final
DO $$
BEGIN
  RAISE NOTICE '✅ Migration concluída com sucesso!';
  RAISE NOTICE '   - Índices criados: idx_ficha_verificacao_rodovia_id, idx_ficha_verificacao_lote_id';
  RAISE NOTICE '   - FKs criadas: ficha_verificacao_rodovia_id_fkey, ficha_verificacao_lote_id_fkey';
END $$;