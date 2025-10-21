-- Etapa 1: Adicionar campos de soft delete às tabelas de inventário

-- Tabela: ficha_placa
ALTER TABLE public.ficha_placa
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS substituido_por UUID REFERENCES public.ficha_placa(id),
ADD COLUMN IF NOT EXISTS substituido_em TIMESTAMPTZ;

-- Tabela: ficha_marcas_longitudinais
ALTER TABLE public.ficha_marcas_longitudinais
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS substituido_por UUID REFERENCES public.ficha_marcas_longitudinais(id),
ADD COLUMN IF NOT EXISTS substituido_em TIMESTAMPTZ;

-- Tabela: ficha_tachas
ALTER TABLE public.ficha_tachas
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS substituido_por UUID REFERENCES public.ficha_tachas(id),
ADD COLUMN IF NOT EXISTS substituido_em TIMESTAMPTZ;

-- Tabela: ficha_cilindros
ALTER TABLE public.ficha_cilindros
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS substituido_por UUID REFERENCES public.ficha_cilindros(id),
ADD COLUMN IF NOT EXISTS substituido_em TIMESTAMPTZ;

-- Tabela: ficha_inscricoes
ALTER TABLE public.ficha_inscricoes
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS substituido_por UUID REFERENCES public.ficha_inscricoes(id),
ADD COLUMN IF NOT EXISTS substituido_em TIMESTAMPTZ;

-- Tabela: ficha_porticos
ALTER TABLE public.ficha_porticos
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS substituido_por UUID REFERENCES public.ficha_porticos(id),
ADD COLUMN IF NOT EXISTS substituido_em TIMESTAMPTZ;

-- Tabela: defensas
ALTER TABLE public.defensas
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS substituido_por UUID REFERENCES public.defensas(id),
ADD COLUMN IF NOT EXISTS substituido_em TIMESTAMPTZ;

-- Criar índices para melhorar performance nas consultas
CREATE INDEX IF NOT EXISTS idx_ficha_placa_ativo ON public.ficha_placa(ativo);
CREATE INDEX IF NOT EXISTS idx_ficha_placa_substituido_por ON public.ficha_placa(substituido_por);

CREATE INDEX IF NOT EXISTS idx_ficha_marcas_longitudinais_ativo ON public.ficha_marcas_longitudinais(ativo);
CREATE INDEX IF NOT EXISTS idx_ficha_marcas_longitudinais_substituido_por ON public.ficha_marcas_longitudinais(substituido_por);

CREATE INDEX IF NOT EXISTS idx_ficha_tachas_ativo ON public.ficha_tachas(ativo);
CREATE INDEX IF NOT EXISTS idx_ficha_tachas_substituido_por ON public.ficha_tachas(substituido_por);

CREATE INDEX IF NOT EXISTS idx_ficha_cilindros_ativo ON public.ficha_cilindros(ativo);
CREATE INDEX IF NOT EXISTS idx_ficha_cilindros_substituido_por ON public.ficha_cilindros(substituido_por);

CREATE INDEX IF NOT EXISTS idx_ficha_inscricoes_ativo ON public.ficha_inscricoes(ativo);
CREATE INDEX IF NOT EXISTS idx_ficha_inscricoes_substituido_por ON public.ficha_inscricoes(substituido_por);

CREATE INDEX IF NOT EXISTS idx_ficha_porticos_ativo ON public.ficha_porticos(ativo);
CREATE INDEX IF NOT EXISTS idx_ficha_porticos_substituido_por ON public.ficha_porticos(substituido_por);

CREATE INDEX IF NOT EXISTS idx_defensas_ativo ON public.defensas(ativo);
CREATE INDEX IF NOT EXISTS idx_defensas_substituido_por ON public.defensas(substituido_por);

-- Atualizar todos os registros existentes para ativo = true (garantir consistência)
UPDATE public.ficha_placa SET ativo = true WHERE ativo IS NULL;
UPDATE public.ficha_marcas_longitudinais SET ativo = true WHERE ativo IS NULL;
UPDATE public.ficha_tachas SET ativo = true WHERE ativo IS NULL;
UPDATE public.ficha_cilindros SET ativo = true WHERE ativo IS NULL;
UPDATE public.ficha_inscricoes SET ativo = true WHERE ativo IS NULL;
UPDATE public.ficha_porticos SET ativo = true WHERE ativo IS NULL;
UPDATE public.defensas SET ativo = true WHERE ativo IS NULL;