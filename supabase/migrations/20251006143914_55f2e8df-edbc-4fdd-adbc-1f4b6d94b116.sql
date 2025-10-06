-- Passo 1: Adicionar colunas de KM na tabela lotes_rodovias
ALTER TABLE public.lotes_rodovias 
ADD COLUMN km_inicial numeric,
ADD COLUMN km_final numeric;

COMMENT ON COLUMN public.lotes_rodovias.km_inicial IS 'KM inicial da rodovia neste lote específico';
COMMENT ON COLUMN public.lotes_rodovias.km_final IS 'KM final da rodovia neste lote específico';

-- Passo 2: Migrar dados existentes (se houver)
-- Como ainda não temos dados em produção, não precisa migrar

-- Passo 3: Remover colunas de KM da tabela rodovias (não mais necessário por lote)
ALTER TABLE public.rodovias 
DROP COLUMN IF EXISTS km_inicial,
DROP COLUMN IF EXISTS km_final;

-- Passo 4: Adicionar constraints para garantir integridade
ALTER TABLE public.lotes_rodovias
ADD CONSTRAINT check_km_inicial_menor_que_final 
CHECK (km_inicial IS NULL OR km_final IS NULL OR km_inicial <= km_final);

-- Passo 5: Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_lotes_rodovias_lote_id ON public.lotes_rodovias(lote_id);
CREATE INDEX IF NOT EXISTS idx_lotes_rodovias_rodovia_id ON public.lotes_rodovias(rodovia_id);