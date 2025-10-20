-- Permitir que lotes sejam criados sem empresa/supervisora associada
ALTER TABLE lotes 
ALTER COLUMN empresa_id DROP NOT NULL,
ALTER COLUMN supervisora_id DROP NOT NULL;

-- Adicionar comentários explicativos
COMMENT ON COLUMN lotes.empresa_id IS 'Empresa executora responsável pelo lote (opcional até associação manual)';
COMMENT ON COLUMN lotes.supervisora_id IS 'Empresa supervisora responsável pelo lote (opcional até associação manual)';