-- LIMPEZA COMPLETA: Remover TODAS as políticas existentes de importacoes_log
DROP POLICY IF EXISTS "Authenticated users can create import logs" ON public.importacoes_log;
DROP POLICY IF EXISTS "Authenticated users can update import logs" ON public.importacoes_log;
DROP POLICY IF EXISTS "Users can create their own import logs" ON public.importacoes_log;
DROP POLICY IF EXISTS "Users can update their own import logs" ON public.importacoes_log;
DROP POLICY IF EXISTS "Usuários autenticados podem criar logs de importação" ON public.importacoes_log;
DROP POLICY IF EXISTS "Usuários autenticados podem ver logs de importação" ON public.importacoes_log;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios logs" ON public.importacoes_log;

-- RECRIAR POLÍTICAS LIMPAS E FUNCIONAIS

-- 1. SELECT: Usuários autenticados veem todos os logs
CREATE POLICY "authenticated_select_logs"
ON public.importacoes_log
FOR SELECT
TO authenticated
USING (true);

-- 2. INSERT: Usuários autenticados podem criar logs com seu próprio user_id
CREATE POLICY "authenticated_insert_logs"
ON public.importacoes_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = usuario_id);

-- 3. UPDATE: Usuários autenticados podem atualizar qualquer log, mas apenas com seu user_id
-- (CRÍTICO para upserts funcionarem)
CREATE POLICY "authenticated_update_logs"
ON public.importacoes_log
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (auth.uid() = usuario_id);

-- 4. DELETE: Apenas admins podem deletar logs
CREATE POLICY "admin_delete_logs"
ON public.importacoes_log
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));