-- Adiciona coluna email_prefixo na tabela supervisoras
ALTER TABLE public.supervisoras 
ADD COLUMN email_prefixo TEXT;

-- Adiciona comentário explicativo
COMMENT ON COLUMN public.supervisoras.email_prefixo IS 'Prefixo para email da supervisora no formato prefixo@operavia.online';