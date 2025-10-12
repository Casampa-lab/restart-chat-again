-- Adicionar campos específicos para necessidades_marcas_transversais (Zebrados)
ALTER TABLE public.necessidades_marcas_transversais 
ADD COLUMN IF NOT EXISTS sigla text,
ADD COLUMN IF NOT EXISTS descricao text,
ADD COLUMN IF NOT EXISTS espessura_mm numeric,
ADD COLUMN IF NOT EXISTS km numeric,
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric,
ADD COLUMN IF NOT EXISTS snv text;

-- Comentários explicativos
COMMENT ON COLUMN public.necessidades_marcas_transversais.sigla IS 'Código de identificação do tipo de marca (ex: LRV, LEGENDA, PEM, ZPA, LDP, SIP, LRE)';
COMMENT ON COLUMN public.necessidades_marcas_transversais.descricao IS 'Descrição completa da marca conforme Manual Brasileiro de Sinalização de Trânsito Volume IV';
COMMENT ON COLUMN public.necessidades_marcas_transversais.espessura_mm IS 'Espessura da inscrição no pavimento em milímetros';
COMMENT ON COLUMN public.necessidades_marcas_transversais.km IS 'Km único de implantação (diferente de km_inicial/final)';
COMMENT ON COLUMN public.necessidades_marcas_transversais.latitude IS 'Latitude única de implantação (diferente de latitude_inicial/final)';
COMMENT ON COLUMN public.necessidades_marcas_transversais.longitude IS 'Longitude única de implantação (diferente de longitude_inicial/final)';