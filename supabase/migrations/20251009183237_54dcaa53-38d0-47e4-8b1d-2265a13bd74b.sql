-- Ajustes na tabela ficha_placa para prontuário completo
-- Adicionar campos que podem estar faltando e ajustar tipos

-- Verificar e adicionar campo 'empresa' se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ficha_placa' AND column_name = 'empresa') THEN
    ALTER TABLE public.ficha_placa ADD COLUMN empresa text;
  END IF;
END $$;

-- Verificar e adicionar campo 'contrato' se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ficha_placa' AND column_name = 'contrato') THEN
    ALTER TABLE public.ficha_placa ADD COLUMN contrato text;
  END IF;
END $$;

-- Adicionar campo para identificação única do inventário (número de patrimônio)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ficha_placa' AND column_name = 'numero_patrimonio') THEN
    ALTER TABLE public.ficha_placa ADD COLUMN numero_patrimonio text;
  END IF;
END $$;

-- Adicionar índice para busca rápida por código de placa
CREATE INDEX IF NOT EXISTS idx_ficha_placa_codigo ON public.ficha_placa(codigo);

-- Adicionar índice para busca por número de patrimônio
CREATE INDEX IF NOT EXISTS idx_ficha_placa_patrimonio ON public.ficha_placa(numero_patrimonio);

-- Adicionar índice para busca por rodovia e km
CREATE INDEX IF NOT EXISTS idx_ficha_placa_rodovia_km ON public.ficha_placa(rodovia_id, km);

-- Comentários para documentação
COMMENT ON TABLE public.ficha_placa IS 'Prontuário permanente de placas de sinalização - registra todas as informações da placa ao longo de sua vida útil';
COMMENT ON TABLE public.ficha_placa_danos IS 'Histórico de danos identificados nas placas';
COMMENT ON TABLE public.ficha_placa_intervencoes IS 'Histórico de intervenções realizadas nas placas';