-- Adicionar campos faltantes na tabela ficha_placa conforme dicionário

ALTER TABLE ficha_placa
ADD COLUMN IF NOT EXISTS posicao text,
ADD COLUMN IF NOT EXISTS detalhamento_pagina integer,
ADD COLUMN IF NOT EXISTS tipo_secao_suporte text,
ADD COLUMN IF NOT EXISTS secao_suporte_mm text,
ADD COLUMN IF NOT EXISTS si_sinal_impresso text,
ADD COLUMN IF NOT EXISTS tipo_pelicula_fundo text,
ADD COLUMN IF NOT EXISTS cor_pelicula_fundo text,
ADD COLUMN IF NOT EXISTS tipo_pelicula_legenda_orla text,
ADD COLUMN IF NOT EXISTS cor_pelicula_legenda_orla text,
ADD COLUMN IF NOT EXISTS retro_pelicula_legenda_orla numeric,
ADD COLUMN IF NOT EXISTS link_fotografia text;