-- Remove políticas RLS redundantes, mantendo apenas a política Admin completa
DROP POLICY IF EXISTS "All authenticated users can read rodovias" ON rodovias;
DROP POLICY IF EXISTS "Coordenadores e admins podem ver rodovias" ON rodovias;