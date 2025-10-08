-- Função para gerar código de convite automaticamente
CREATE OR REPLACE FUNCTION generate_codigo_convite()
RETURNS TEXT
LANGUAGE plpgsql
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

-- Atualizar trigger para criar perfil com código de convite
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supervisora_id_from_code UUID;
BEGIN
  -- Buscar supervisora pelo código de convite se fornecido
  IF NEW.raw_user_meta_data->>'codigo_convite' IS NOT NULL THEN
    SELECT id INTO supervisora_id_from_code
    FROM public.supervisoras
    WHERE codigo_convite = NEW.raw_user_meta_data->>'codigo_convite';
  END IF;

  INSERT INTO public.profiles (id, nome, supervisora_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    supervisora_id_from_code
  );
  RETURN NEW;
END;
$$;