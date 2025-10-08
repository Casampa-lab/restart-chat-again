-- Transferir todas as empresas e perfis da Supervisora Principal para CONSOL
DO $$
DECLARE
  supervisora_principal_id UUID;
  consol_id UUID;
BEGIN
  -- Buscar ID da Supervisora Principal
  SELECT id INTO supervisora_principal_id 
  FROM supervisoras 
  WHERE nome_empresa = 'Supervisora Principal';

  -- Buscar ID da CONSOL
  SELECT id INTO consol_id 
  FROM supervisoras 
  WHERE nome_empresa = 'CONSOL ENGENHEIROS CONSULTORES LTDA';

  -- Transferir empresas
  UPDATE empresas 
  SET supervisora_id = consol_id 
  WHERE supervisora_id = supervisora_principal_id;

  -- Transferir perfis de usuários
  UPDATE profiles 
  SET supervisora_id = consol_id 
  WHERE supervisora_id = supervisora_principal_id;

  RAISE NOTICE 'Dados transferidos com sucesso!';
END $$;