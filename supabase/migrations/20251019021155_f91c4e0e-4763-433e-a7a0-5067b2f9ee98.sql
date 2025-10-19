-- Remover DEFAULT atual da coluna numero_nc
ALTER TABLE public.nao_conformidades 
ALTER COLUMN numero_nc DROP DEFAULT;

-- Remover função antiga se existir
DROP FUNCTION IF EXISTS public.generate_nc_number();

-- Criar função do trigger para gerar número de NC por supervisora
CREATE OR REPLACE FUNCTION public.set_nc_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_supervisora_id UUID;
  v_next_num INTEGER;
  v_new_number TEXT;
BEGIN
  -- Se já tem número, não faz nada
  IF NEW.numero_nc IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar supervisora do usuário
  SELECT supervisora_id INTO v_supervisora_id
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Buscar próximo número da supervisora
  SELECT COALESCE(MAX(CAST(SUBSTRING(nc.numero_nc FROM 3) AS INTEGER)), 0) + 1
  INTO v_next_num
  FROM public.nao_conformidades nc
  INNER JOIN public.profiles p ON p.id = nc.user_id
  WHERE p.supervisora_id = v_supervisora_id
    AND nc.numero_nc ~ '^NC[0-9]+$';

  -- Gerar número formatado (NC00001, NC00002, etc.)
  v_new_number := 'NC' || LPAD(v_next_num::TEXT, 5, '0');
  
  NEW.numero_nc := v_new_number;
  RETURN NEW;
END;
$$;

-- Criar trigger para executar antes de cada INSERT
DROP TRIGGER IF EXISTS trigger_set_nc_number ON public.nao_conformidades;
CREATE TRIGGER trigger_set_nc_number
  BEFORE INSERT ON public.nao_conformidades
  FOR EACH ROW
  EXECUTE FUNCTION public.set_nc_number();