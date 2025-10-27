-- Adicionar colunas lote_id e rodovia_id à tabela ficha_cilindros_intervencoes
ALTER TABLE public.ficha_cilindros_intervencoes
ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES public.lotes(id),
ADD COLUMN IF NOT EXISTS rodovia_id uuid REFERENCES public.rodovias(id);

-- Tornar user_id obrigatório (NOT NULL)
-- Primeiro, preencher user_id NULL com um valor padrão (se houver registros)
UPDATE public.ficha_cilindros_intervencoes
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id IS NULL;

-- Depois tornar NOT NULL
ALTER TABLE public.ficha_cilindros_intervencoes
ALTER COLUMN user_id SET NOT NULL;

-- Criar índices para melhorar performance dos JOINs
CREATE INDEX IF NOT EXISTS idx_cilindros_intervencoes_lote 
ON public.ficha_cilindros_intervencoes(lote_id);

CREATE INDEX IF NOT EXISTS idx_cilindros_intervencoes_rodovia 
ON public.ficha_cilindros_intervencoes(rodovia_id);