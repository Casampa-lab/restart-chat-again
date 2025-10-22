-- Adicionar coluna cadastro_match_id
ALTER TABLE necessidades_placas ADD COLUMN cadastro_match_id uuid;

-- Popular com cadastro_id
UPDATE necessidades_placas SET cadastro_match_id = cadastro_id WHERE cadastro_id IS NOT NULL;