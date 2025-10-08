-- Adicionar campo de email de envio para cada supervisora
ALTER TABLE public.supervisoras
ADD COLUMN IF NOT EXISTS email_envio TEXT;

COMMENT ON COLUMN public.supervisoras.email_envio IS 'Email usado como remetente nas notificações de NC';
