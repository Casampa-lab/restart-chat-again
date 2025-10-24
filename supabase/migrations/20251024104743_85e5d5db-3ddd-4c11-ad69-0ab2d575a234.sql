-- Remove constraint UNIQUE que impede múltiplos segmentos da mesma rodovia
-- Permite adicionar múltiplos segmentos de uma mesma rodovia ao mesmo lote
ALTER TABLE public.lotes_rodovias 
DROP CONSTRAINT IF EXISTS lotes_rodovias_lote_id_rodovia_id_key;