-- Popular coordinator_assignments para coordenadores existentes
INSERT INTO public.coordinator_assignments (user_id, lote_id)
SELECT DISTINCT
  p.id as user_id,
  l.id as lote_id
FROM profiles p
INNER JOIN user_roles ur ON ur.user_id = p.id
INNER JOIN lotes l ON l.supervisora_id = p.supervisora_id
WHERE ur.role = 'coordenador'
  AND p.supervisora_id IS NOT NULL
ON CONFLICT (user_id, lote_id) DO NOTHING;