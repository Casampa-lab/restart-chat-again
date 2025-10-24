-- Permitir que usuários da mesma supervisora vejam as atribuições de coordenadores
CREATE POLICY "Users can view coordinator assignments in same supervisora"
ON public.coordinator_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles p1
    JOIN public.profiles p2 ON p1.supervisora_id = p2.supervisora_id
    WHERE p1.id = auth.uid()
      AND p2.id = coordinator_assignments.user_id
      AND p1.supervisora_id IS NOT NULL
  )
);