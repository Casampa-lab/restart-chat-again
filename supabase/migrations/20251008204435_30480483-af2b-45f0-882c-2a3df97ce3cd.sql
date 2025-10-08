-- Criar tabela para fotos das não conformidades
CREATE TABLE IF NOT EXISTS public.nao_conformidades_fotos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nc_id UUID NOT NULL REFERENCES public.nao_conformidades(id) ON DELETE CASCADE,
  foto_url TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  sentido TEXT,
  descricao TEXT,
  ordem INTEGER NOT NULL CHECK (ordem >= 1 AND ordem <= 4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para busca por NC
CREATE INDEX idx_nc_fotos_nc_id ON public.nao_conformidades_fotos(nc_id);

-- Habilitar RLS
ALTER TABLE public.nao_conformidades_fotos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Usuários podem gerenciar fotos de suas próprias NCs
CREATE POLICY "Users can view photos of their own NCs"
ON public.nao_conformidades_fotos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.nao_conformidades
    WHERE nao_conformidades.id = nao_conformidades_fotos.nc_id
    AND nao_conformidades.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create photos for their own NCs"
ON public.nao_conformidades_fotos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.nao_conformidades
    WHERE nao_conformidades.id = nao_conformidades_fotos.nc_id
    AND nao_conformidades.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update photos of their own NCs"
ON public.nao_conformidades_fotos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.nao_conformidades
    WHERE nao_conformidades.id = nao_conformidades_fotos.nc_id
    AND nao_conformidades.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete photos of their own NCs"
ON public.nao_conformidades_fotos
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.nao_conformidades
    WHERE nao_conformidades.id = nao_conformidades_fotos.nc_id
    AND nao_conformidades.user_id = auth.uid()
  )
);

-- Coordenadores podem ver todas as fotos
CREATE POLICY "Coordinators can view all nc photos"
ON public.nao_conformidades_fotos
FOR SELECT
USING (
  has_role(auth.uid(), 'coordenador'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);