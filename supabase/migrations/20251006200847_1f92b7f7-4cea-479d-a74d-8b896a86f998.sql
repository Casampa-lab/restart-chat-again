-- Fix: Allow all authenticated users to read reference tables
-- This is necessary for SessionSelector to work

-- Drop the overly restrictive policies
DROP POLICY IF EXISTS "Authenticated users can read rodovias" ON public.rodovias;
DROP POLICY IF EXISTS "Authenticated users can read lotes" ON public.lotes;
DROP POLICY IF EXISTS "Authenticated users can read lotes_rodovias" ON public.lotes_rodovias;

-- Create new policies that allow any authenticated user to read
CREATE POLICY "All authenticated users can read rodovias"
ON public.rodovias
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "All authenticated users can read lotes"
ON public.lotes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "All authenticated users can read lotes_rodovias"
ON public.lotes_rodovias
FOR SELECT
TO authenticated
USING (true);

-- Keep the admin write policies
-- These tables still can only be modified by admins