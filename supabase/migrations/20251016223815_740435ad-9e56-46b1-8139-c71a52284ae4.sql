-- Corrigir função de geração de número de NC
-- A função estava consultando a tabela errada (registro_nc em vez de nao_conformidades)

CREATE OR REPLACE FUNCTION public.generate_nc_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_num INTEGER;
  new_number TEXT;
BEGIN
  -- Buscar o maior número existente na tabela nao_conformidades
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_nc FROM 3) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.nao_conformidades
  WHERE numero_nc ~ '^NC[0-9]+$'; -- Garantir que só considera números válidos no formato NC00000
  
  -- Formatar com padding de 5 dígitos
  new_number := 'NC' || LPAD(next_num::TEXT, 5, '0');
  RETURN new_number;
END;
$function$;