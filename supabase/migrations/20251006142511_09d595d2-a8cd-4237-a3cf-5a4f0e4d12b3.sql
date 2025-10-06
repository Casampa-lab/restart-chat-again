-- Alterar o campo prazo_atendimento de date para integer (dias)
ALTER TABLE public.nao_conformidades 
ALTER COLUMN prazo_atendimento TYPE integer USING NULL;

COMMENT ON COLUMN public.nao_conformidades.prazo_atendimento IS 'Prazo de atendimento em dias';