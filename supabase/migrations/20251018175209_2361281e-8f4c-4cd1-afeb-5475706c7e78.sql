-- Adicionar campo tipo_refletivo na tabela ficha_tachas
ALTER TABLE public.ficha_tachas 
ADD COLUMN tipo_refletivo TEXT;

COMMENT ON COLUMN public.ficha_tachas.tipo_refletivo IS 'Tipo do refletivo utilizado na tacha conforme NBR 14.644/2021 (I, II, III, IV, VII, IX, X)';

-- Adicionar campo tipo_refletivo na tabela necessidades_tachas
ALTER TABLE public.necessidades_tachas 
ADD COLUMN tipo_refletivo TEXT;

COMMENT ON COLUMN public.necessidades_tachas.tipo_refletivo IS 'Tipo do refletivo utilizado na tacha conforme NBR 14.644/2021 (I, II, III, IV, VII, IX, X)';

-- Adicionar campo tipo_refletivo na tabela de intervenções de tachas
ALTER TABLE public.ficha_tachas_intervencoes 
ADD COLUMN tipo_refletivo TEXT;

COMMENT ON COLUMN public.ficha_tachas_intervencoes.tipo_refletivo IS 'Tipo do refletivo utilizado na tacha conforme NBR 14.644/2021 (I, II, III, IV, VII, IX, X)';