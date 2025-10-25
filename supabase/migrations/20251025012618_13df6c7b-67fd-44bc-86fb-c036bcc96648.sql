
-- =====================================================
-- CORREÇÃO: Alterar FK user_id para apontar para profiles
-- Data: 2025-10-25
-- Problema: FK apontava para auth.users (não acessível via API)
-- Solução: Apontar para public.profiles para permitir joins
-- =====================================================

-- PASSO 1: Dropar FK antiga que aponta para auth.users
ALTER TABLE public.ficha_placa_intervencoes
  DROP CONSTRAINT IF EXISTS ficha_placa_intervencoes_user_id_fkey;

-- PASSO 2: Criar índice (se não existir)
CREATE INDEX IF NOT EXISTS idx_ficha_placa_intervencoes_user_id 
  ON public.ficha_placa_intervencoes(user_id);

-- PASSO 3: Criar nova FK apontando para public.profiles
ALTER TABLE public.ficha_placa_intervencoes
  ADD CONSTRAINT ficha_placa_intervencoes_user_id_fkey
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id)
  ON UPDATE CASCADE 
  ON DELETE RESTRICT;

-- PASSO 4: Adicionar comentário
COMMENT ON CONSTRAINT ficha_placa_intervencoes_user_id_fkey 
  ON public.ficha_placa_intervencoes 
  IS 'FK para profiles - permite join explícito via PostgREST';
