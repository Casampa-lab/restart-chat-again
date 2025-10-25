-- Migration: Limpar órfãos e criar FK ficha_verificacao → profiles

-- 0) Listar órfãos atuais (registro)
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '=== Fichas órfãs encontradas ===';
  FOR rec IN 
    SELECT fv.id as ficha_id, fv.user_id, fv.created_at
    FROM public.ficha_verificacao fv
    LEFT JOIN public.profiles p ON p.id = fv.user_id
    LEFT JOIN auth.users u ON u.id = fv.user_id
    WHERE p.id IS NULL AND u.id IS NULL
    ORDER BY fv.created_at DESC
  LOOP
    RAISE NOTICE 'Ficha ID: %, User ID: %, Criada em: %', rec.ficha_id, rec.user_id, rec.created_at;
  END LOOP;
END $$;

-- 1) Deletar fichas órfãs
DELETE FROM public.ficha_verificacao fv
USING (
  SELECT fv2.id
  FROM public.ficha_verificacao fv2
  LEFT JOIN public.profiles p ON p.id = fv2.user_id
  LEFT JOIN auth.users u ON u.id = fv2.user_id
  WHERE p.id IS NULL AND u.id IS NULL
) z
WHERE fv.id = z.id;

-- 2) Conferência: não deve sobrar órfão
DO $$
DECLARE
  orfaos_restantes INTEGER;
BEGIN
  SELECT COUNT(*) INTO orfaos_restantes
  FROM public.ficha_verificacao fv
  LEFT JOIN public.profiles p ON p.id = fv.user_id
  WHERE p.id IS NULL;
  
  IF orfaos_restantes > 0 THEN
    RAISE EXCEPTION '❌ Ainda existem % fichas órfãs após limpeza!', orfaos_restantes;
  ELSE
    RAISE NOTICE '✅ Limpeza concluída. Nenhum órfão restante.';
  END IF;
END $$;

-- 3) Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_ficha_verificacao_user_id
  ON public.ficha_verificacao(user_id);

-- 4) Criar Foreign Key
ALTER TABLE public.ficha_verificacao
  ADD CONSTRAINT ficha_verificacao_user_id_fkey
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

-- 5) Comentário para documentação
COMMENT ON CONSTRAINT ficha_verificacao_user_id_fkey 
  ON public.ficha_verificacao IS
  'Garante integridade entre ficha_verificacao.user_id e profiles.id (UPDATE CASCADE, DELETE RESTRICT)';

-- 6) Verificação final
DO $$
BEGIN
  RAISE NOTICE '✅ Migration concluída com sucesso!';
  RAISE NOTICE '   - Órfãos removidos';
  RAISE NOTICE '   - Índice criado: idx_ficha_verificacao_user_id';
  RAISE NOTICE '   - FK criada: ficha_verificacao_user_id_fkey';
END $$;