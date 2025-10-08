-- Deletar usuários duplicados da Luciana Matos (mantendo o que tem supervisora vinculada)
DELETE FROM auth.users 
WHERE id IN ('a413c016-72f0-4aec-963d-702142debe3c', 'c06eef01-cfc1-40da-beea-2be71ef41cc6');

-- Os profiles serão deletados automaticamente por causa do ON DELETE CASCADE