-- Criar tabela para rastrear importações realizadas
CREATE TABLE IF NOT EXISTS public.importacoes_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lote_id UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
  rodovia_id UUID NOT NULL REFERENCES public.rodovias(id) ON DELETE CASCADE,
  tipo_inventario TEXT NOT NULL,
  total_registros INTEGER NOT NULL DEFAULT 0,
  usuario_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lote_id, rodovia_id, tipo_inventario)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_importacoes_log_lote_rodovia 
ON public.importacoes_log(lote_id, rodovia_id);

-- RLS Policies
ALTER TABLE public.importacoes_log ENABLE ROW LEVEL SECURITY;

-- Permitir leitura para usuários autenticados
CREATE POLICY "Usuários autenticados podem ver logs de importação"
ON public.importacoes_log
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Permitir inserção para usuários autenticados
CREATE POLICY "Usuários autenticados podem criar logs de importação"
ON public.importacoes_log
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = usuario_id);

-- Permitir atualização para o próprio usuário ou admins
CREATE POLICY "Usuários podem atualizar seus próprios logs"
ON public.importacoes_log
FOR UPDATE
USING (auth.uid() = usuario_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = usuario_id OR public.has_role(auth.uid(), 'admin'));