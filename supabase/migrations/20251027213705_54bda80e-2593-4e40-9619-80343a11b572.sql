-- ============================================
-- CORREÇÃO EMERGENCIAL: Inscrições e Tachas
-- Permitir registro sem FK para modo Execução
-- ============================================

-- 1. Tornar FKs opcionais em ficha_inscricoes_intervencoes
ALTER TABLE public.ficha_inscricoes_intervencoes 
  ALTER COLUMN ficha_inscricoes_id DROP NOT NULL;

COMMENT ON COLUMN public.ficha_inscricoes_intervencoes.ficha_inscricoes_id 
  IS 'Opcional: NULL para intervenções de execução, obrigatório para manutenção pré-projeto';

-- 2. Tornar FKs opcionais em ficha_tachas_intervencoes
ALTER TABLE public.ficha_tachas_intervencoes 
  ALTER COLUMN ficha_tachas_id DROP NOT NULL;

COMMENT ON COLUMN public.ficha_tachas_intervencoes.ficha_tachas_id 
  IS 'Opcional: NULL para intervenções de execução, obrigatório para manutenção pré-projeto';

-- 3. Adicionar campos obrigatórios que estavam faltando (se não existirem)
ALTER TABLE public.ficha_inscricoes_intervencoes 
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES lotes(id),
  ADD COLUMN IF NOT EXISTS rodovia_id uuid REFERENCES rodovias(id);

ALTER TABLE public.ficha_tachas_intervencoes 
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES lotes(id),
  ADD COLUMN IF NOT EXISTS rodovia_id uuid REFERENCES rodovias(id);

-- 4. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_inscricoes_interv_user ON ficha_inscricoes_intervencoes(user_id);
CREATE INDEX IF NOT EXISTS idx_tachas_interv_user ON ficha_tachas_intervencoes(user_id);

-- ============================================
-- RLS: Permitir INSERT sem FK para execução
-- ============================================

-- Inscrições: Permitir insert sem FK se for do próprio usuário
DROP POLICY IF EXISTS "ficha_inscricoes_intervencoes_insert_roles" ON ficha_inscricoes_intervencoes;

CREATE POLICY "ficha_inscricoes_intervencoes_insert_roles" 
ON ficha_inscricoes_intervencoes
FOR INSERT
WITH CHECK (
  -- Admin e coordenador podem tudo
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'coordenador'::app_role)
  -- Técnico pode inserir se for dele
  OR (
    has_role(auth.uid(), 'tecnico'::app_role) 
    AND user_id = auth.uid()
  )
);

-- Tachas: Permitir insert sem FK se for do próprio usuário
DROP POLICY IF EXISTS "ficha_tachas_intervencoes_insert_roles" ON ficha_tachas_intervencoes;

CREATE POLICY "ficha_tachas_intervencoes_insert_roles" 
ON ficha_tachas_intervencoes
FOR INSERT
WITH CHECK (
  -- Admin e coordenador podem tudo
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'coordenador'::app_role)
  -- Técnico pode inserir se for dele
  OR (
    has_role(auth.uid(), 'tecnico'::app_role) 
    AND user_id = auth.uid()
  )
);