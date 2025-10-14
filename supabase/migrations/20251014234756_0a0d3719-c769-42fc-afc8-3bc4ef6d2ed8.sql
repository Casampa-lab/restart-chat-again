-- Adicionar novos campos para ZEBRADOS/INSCRIÇÕES na tabela ficha_inscricoes
ALTER TABLE public.ficha_inscricoes
ADD COLUMN IF NOT EXISTS sigla text,
ADD COLUMN IF NOT EXISTS espessura_mm numeric;

COMMENT ON COLUMN public.ficha_inscricoes.sigla IS 'Código de identificação do tipo de marca transversal (ZPA, MOF, PEM, LEGENDA)';
COMMENT ON COLUMN public.ficha_inscricoes.espessura_mm IS 'Espessura da inscrição no pavimento em milímetros (ex: 3.00mm para termoplástico por extrusão)';

-- Adicionar os mesmos campos na tabela de intervenções
ALTER TABLE public.ficha_inscricoes_intervencoes
ADD COLUMN IF NOT EXISTS sigla text,
ADD COLUMN IF NOT EXISTS espessura_mm numeric;

COMMENT ON COLUMN public.ficha_inscricoes_intervencoes.sigla IS 'Código de identificação do tipo de marca transversal (ZPA, MOF, PEM, LEGENDA)';
COMMENT ON COLUMN public.ficha_inscricoes_intervencoes.espessura_mm IS 'Espessura da inscrição no pavimento em milímetros';