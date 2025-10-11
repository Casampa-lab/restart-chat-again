-- Adicionar campo foto_url na tabela ficha_placa para compatibilidade com outros inventários
ALTER TABLE public.ficha_placa 
ADD COLUMN IF NOT EXISTS foto_url text;