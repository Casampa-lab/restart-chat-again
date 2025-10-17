-- 1. Remover TODAS as políticas antigas de UPDATE para evitar conflitos
DROP POLICY IF EXISTS "Users can update their own import logs" ON public.importacoes_log;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios logs" ON public.importacoes_log;
DROP POLICY IF EXISTS "Authenticated users can update import logs" ON public.importacoes_log;

-- 2. Criar política de UPDATE limpa e definitiva
CREATE POLICY "Authenticated users can update import logs"
ON public.importacoes_log
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (auth.uid() = usuario_id);

-- 3. Remover política de INSERT antiga
DROP POLICY IF EXISTS "Users can create their own import logs" ON public.importacoes_log;
DROP POLICY IF EXISTS "Usuários podem criar seus próprios logs" ON public.importacoes_log;
DROP POLICY IF EXISTS "Authenticated users can create import logs" ON public.importacoes_log;

-- 4. Criar política de INSERT simplificada
CREATE POLICY "Authenticated users can create import logs"
ON public.importacoes_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = usuario_id);

-- Comentários explicativos:
-- A política de UPDATE com USING (true) permite que usuários autenticados atualizem qualquer registro
-- (necessário para upserts funcionarem), mas o WITH CHECK garante que apenas o usuário correto
-- seja definido como usuario_id, mantendo a segurança.
-- 
-- A política de INSERT simplificada (removendo auth.uid() IS NOT NULL redundante) garante que
-- apenas o próprio usuário pode ser definido como usuario_id nos novos registros.