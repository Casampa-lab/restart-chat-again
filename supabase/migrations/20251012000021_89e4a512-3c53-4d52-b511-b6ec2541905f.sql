-- Adicionar campo para logo do órgão fiscalizador nas supervisoras
ALTER TABLE public.supervisoras 
ADD COLUMN logo_orgao_fiscalizador_url TEXT;

-- Comentário explicativo
COMMENT ON COLUMN public.supervisoras.logo_orgao_fiscalizador_url IS 'URL do logo do órgão fiscalizador (DNIT, DER, etc.) - configurável por supervisora';
