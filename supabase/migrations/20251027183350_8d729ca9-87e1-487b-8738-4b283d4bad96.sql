DO $$
DECLARE
  fk_rec RECORD;
BEGIN
  -- Drop any existing FK on user_id
  FOR fk_rec IN
    SELECT con.conname
    FROM pg_constraint AS con
    JOIN pg_class     AS cls ON cls.oid = con.conrelid
    JOIN pg_namespace AS nsp ON nsp.oid = cls.relnamespace
    JOIN unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
    JOIN pg_attribute AS att ON att.attrelid = cls.oid AND att.attnum = k.attnum
    WHERE con.contype = 'f'
      AND nsp.nspname = 'public'
      AND cls.relname = 'ficha_cilindros_intervencoes'
      AND att.attname = 'user_id'
  LOOP
    EXECUTE format('ALTER TABLE public.ficha_cilindros_intervencoes DROP CONSTRAINT %I', fk_rec.conname);
  END LOOP;

  -- Make user_id nullable
  ALTER TABLE public.ficha_cilindros_intervencoes
    ALTER COLUMN user_id DROP NOT NULL;

  -- Create updated FK with ON DELETE SET NULL
  ALTER TABLE public.ficha_cilindros_intervencoes
    ADD CONSTRAINT fk_ficha_cilindros_intervencoes_user
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;
END$$;