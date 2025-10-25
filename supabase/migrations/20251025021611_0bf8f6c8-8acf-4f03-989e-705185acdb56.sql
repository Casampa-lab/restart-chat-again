-- Adicionar campos faltantes em ficha_placa_intervencoes
ALTER TABLE ficha_placa_intervencoes
ADD COLUMN IF NOT EXISTS br text,
ADD COLUMN IF NOT EXISTS snv text,
ADD COLUMN IF NOT EXISTS velocidade text,
ADD COLUMN IF NOT EXISTS posicao text,
ADD COLUMN IF NOT EXISTS detalhamento_pagina integer,
ADD COLUMN IF NOT EXISTS qtde_suporte integer,
ADD COLUMN IF NOT EXISTS tipo_secao_suporte text,
ADD COLUMN IF NOT EXISTS secao_suporte_mm text,
ADD COLUMN IF NOT EXISTS si_sinal_impresso text,
ADD COLUMN IF NOT EXISTS cor_pelicula_fundo text,
ADD COLUMN IF NOT EXISTS tipo_pelicula_legenda_orla text,
ADD COLUMN IF NOT EXISTS cor_pelicula_legenda_orla text,
ADD COLUMN IF NOT EXISTS area_m2 numeric,
ADD COLUMN IF NOT EXISTS substrato_suporte text;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_ficha_placa_intervencoes_br ON ficha_placa_intervencoes(br);
CREATE INDEX IF NOT EXISTS idx_ficha_placa_intervencoes_snv ON ficha_placa_intervencoes(snv);
CREATE INDEX IF NOT EXISTS idx_ficha_placa_intervencoes_velocidade ON ficha_placa_intervencoes(velocidade);

-- Comentários explicativos
COMMENT ON COLUMN ficha_placa_intervencoes.br IS 'Código BR da rodovia';
COMMENT ON COLUMN ficha_placa_intervencoes.snv IS 'Código SNV';
COMMENT ON COLUMN ficha_placa_intervencoes.velocidade IS 'Velocidade máxima da via';
COMMENT ON COLUMN ficha_placa_intervencoes.posicao IS 'Posição da placa (Ex: sobre a pista, lateral direita, etc)';
COMMENT ON COLUMN ficha_placa_intervencoes.detalhamento_pagina IS 'Número da página de detalhamento';
COMMENT ON COLUMN ficha_placa_intervencoes.qtde_suporte IS 'Quantidade de suportes';
COMMENT ON COLUMN ficha_placa_intervencoes.tipo_secao_suporte IS 'Tipo da seção do suporte (Ex: Circular, Retangular)';
COMMENT ON COLUMN ficha_placa_intervencoes.secao_suporte_mm IS 'Seção do suporte em milímetros';
COMMENT ON COLUMN ficha_placa_intervencoes.si_sinal_impresso IS 'Sinal Impresso (Sim/Não)';
COMMENT ON COLUMN ficha_placa_intervencoes.cor_pelicula_fundo IS 'Cor da película de fundo';
COMMENT ON COLUMN ficha_placa_intervencoes.tipo_pelicula_legenda_orla IS 'Tipo da película da legenda/orla';
COMMENT ON COLUMN ficha_placa_intervencoes.cor_pelicula_legenda_orla IS 'Cor da película da legenda/orla';
COMMENT ON COLUMN ficha_placa_intervencoes.area_m2 IS 'Área da placa em m²';
COMMENT ON COLUMN ficha_placa_intervencoes.substrato_suporte IS 'Material do substrato do suporte';