-- Corrigir função generate_codigo_convite com search_path seguro
CREATE OR REPLACE FUNCTION generate_codigo_convite()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  novo_codigo TEXT;
  codigo_existe BOOLEAN;
BEGIN
  LOOP
    novo_codigo := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM supervisoras WHERE codigo_convite = novo_codigo) INTO codigo_existe;
    EXIT WHEN NOT codigo_existe;
  END LOOP;
  RETURN novo_codigo;
END;
$$;