-- Adicionar campo para controlar uso do logo customizado
ALTER TABLE public.supervisora 
ADD COLUMN IF NOT EXISTS usar_logo_customizado BOOLEAN DEFAULT false;

-- Comentário explicativo
COMMENT ON COLUMN public.supervisora.usar_logo_customizado IS 'Se true, substitui o logo padrão RodoviaSUPERV pelo logo da supervisora nos cabeçalhos';