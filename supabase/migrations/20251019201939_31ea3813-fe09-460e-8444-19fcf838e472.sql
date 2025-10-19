-- Criar tabela de marcos do inventário (versão minimalista)
CREATE TABLE public.marcos_inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
  rodovia_id UUID NOT NULL REFERENCES public.rodovias(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'marco_zero' CHECK (tipo IN ('marco_zero', 'checkpoint', 'final')),
  data_marco TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX idx_marcos_inventario_lote ON public.marcos_inventario(lote_id);
CREATE INDEX idx_marcos_inventario_rodovia ON public.marcos_inventario(rodovia_id);
CREATE INDEX idx_marcos_inventario_tipo ON public.marcos_inventario(tipo);

-- Habilitar RLS
ALTER TABLE public.marcos_inventario ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários veem marcos do próprio lote ou coordenadores/admins veem todos
CREATE POLICY "Usuários veem marcos do próprio lote"
  ON public.marcos_inventario
  FOR SELECT
  USING (
    lote_id IN (
      SELECT lote_id FROM public.sessoes_trabalho 
      WHERE user_id = auth.uid() AND ativa = true
    )
    OR has_role(auth.uid(), 'coordenador'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Policy: Usuários autenticados podem criar marcos
CREATE POLICY "Usuários autenticados criam marcos"
  ON public.marcos_inventario
  FOR INSERT
  WITH CHECK (auth.uid() = criado_por);