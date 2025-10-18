-- Adicionar campo descricao apenas na tabela ficha_tachas (outras já têm)
ALTER TABLE public.ficha_tachas 
ADD COLUMN descricao TEXT;

COMMENT ON COLUMN public.ficha_tachas.descricao IS 'Descrição do dispositivo - usar termos como "Tacha monodirecional", "Tacha bidirecional" ou "Tachão"';