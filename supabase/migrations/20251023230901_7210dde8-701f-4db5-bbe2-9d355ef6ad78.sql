-- Adicionar coluna largura_m na tabela necessidades_placas
ALTER TABLE necessidades_placas 
ADD COLUMN largura_m NUMERIC;

COMMENT ON COLUMN necessidades_placas.largura_m 
IS 'Largura da placa em metros (campo das necessidades)';