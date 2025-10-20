-- Adicionar constraint única na coluna numero da tabela lotes para permitir upsert
ALTER TABLE lotes 
ADD CONSTRAINT lotes_numero_key UNIQUE (numero);