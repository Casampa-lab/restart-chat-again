-- Renomear coluna distancia_m para largura_m na tabela ficha_placa
ALTER TABLE public.ficha_placa 
RENAME COLUMN distancia_m TO largura_m;