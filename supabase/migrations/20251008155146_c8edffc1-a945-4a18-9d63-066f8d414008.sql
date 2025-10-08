-- Adicionar coluna email na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN email text;

-- Preencher emails existentes a partir da tabela auth.users
UPDATE public.profiles
SET email = (
  SELECT email 
  FROM auth.users 
  WHERE auth.users.id = profiles.id
);

-- Atualizar o trigger para incluir email ao criar novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

  INSERT INTO public.profiles (id, nome, email, supervisora_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    supervisora_id_from_code
  );
  RETURN NEW;
END;
$$;