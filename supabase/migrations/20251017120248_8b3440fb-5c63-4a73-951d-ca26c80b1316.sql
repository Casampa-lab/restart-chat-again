-- Remover política restritiva de UPDATE
DROP POLICY IF EXISTS "Users can update their own import logs" ON public.importacoes_log;

-- Criar nova política de UPDATE que permite usuários autenticados atualizarem logs
-- Isso é necessário para upserts funcionarem corretamente
CREATE POLICY "Authenticated users can update import logs"
ON public.importacoes_log
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (auth.uid() = usuario_id);

-- Comentário: Esta política permite que upserts funcionem corretamente
-- O WITH CHECK garante que apenas o usuário que está fazendo a operação
-- pode ser definido como usuario_id, mantendo a segurança