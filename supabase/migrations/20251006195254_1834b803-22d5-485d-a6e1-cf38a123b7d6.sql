-- Phase 1: Critical Security Fixes

-- 1. Restrict Public Access to Reference Tables
-- Drop existing public read policies
DROP POLICY IF EXISTS "Everyone can read rodovias" ON public.rodovias;
DROP POLICY IF EXISTS "Everyone can read lotes" ON public.lotes;
DROP POLICY IF EXISTS "Everyone can read lotes_rodovias" ON public.lotes_rodovias;

-- Create new authenticated-only policies for rodovias
CREATE POLICY "Authenticated users can read rodovias"
ON public.rodovias
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'coordenador'::app_role) OR
  has_role(auth.uid(), 'tecnico'::app_role)
);

-- Create new authenticated-only policies for lotes
CREATE POLICY "Authenticated users can read lotes"
ON public.lotes
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'coordenador'::app_role) OR
  has_role(auth.uid(), 'tecnico'::app_role)
);

-- Create new authenticated-only policies for lotes_rodovias
CREATE POLICY "Authenticated users can read lotes_rodovias"
ON public.lotes_rodovias
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'coordenador'::app_role) OR
  has_role(auth.uid(), 'tecnico'::app_role)
);

-- 2. Implement Geographic Access Control for Coordinators
-- Create coordinator_assignments table
CREATE TABLE public.coordinator_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lote_id UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, lote_id)
);

-- Enable RLS on coordinator_assignments
ALTER TABLE public.coordinator_assignments ENABLE ROW LEVEL SECURITY;

-- Admin full access to coordinator_assignments
CREATE POLICY "Admin full access coordinator_assignments"
ON public.coordinator_assignments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Coordinators can view their own assignments
CREATE POLICY "Coordinators can view own assignments"
ON public.coordinator_assignments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create function to check if coordinator is assigned to a lot
CREATE OR REPLACE FUNCTION public.coordinator_has_lot_access(_user_id uuid, _lote_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.coordinator_assignments
    WHERE user_id = _user_id AND lote_id = _lote_id
  )
$$;

-- 3. Update nao_conformidades RLS policies with geographic access control
-- Drop the existing broad coordinator policy
DROP POLICY IF EXISTS "Coordenador can view all nc" ON public.nao_conformidades;

-- Create new policy with geographic restrictions
CREATE POLICY "Coordinators can view assigned lots nc"
ON public.nao_conformidades
FOR SELECT
TO authenticated
USING (
  -- Admins can see everything
  has_role(auth.uid(), 'admin'::app_role) OR
  -- Coordinators can only see NCs from their assigned lots
  (has_role(auth.uid(), 'coordenador'::app_role) AND coordinator_has_lot_access(auth.uid(), lote_id))
);

-- Update the coordinator update policy as well
DROP POLICY IF EXISTS "Coordenadores can update all nao_conformidades" ON public.nao_conformidades;

CREATE POLICY "Coordinators can update assigned lots nc"
ON public.nao_conformidades
FOR UPDATE
TO authenticated
USING (
  -- Admins can update everything
  has_role(auth.uid(), 'admin'::app_role) OR
  -- Coordinators can only update NCs from their assigned lots
  (has_role(auth.uid(), 'coordenador'::app_role) AND coordinator_has_lot_access(auth.uid(), lote_id))
);

-- Add comments for documentation
COMMENT ON TABLE public.coordinator_assignments IS 'Assigns coordinators to specific lots for geographic access control - prevents coordinators from viewing all company data';
COMMENT ON FUNCTION public.coordinator_has_lot_access IS 'Security function to check if a coordinator has access to a specific lot';
COMMENT ON TABLE public.rodovias IS 'Highway reference data - Access restricted to authenticated users only to protect operational scope';
COMMENT ON TABLE public.lotes IS 'Lot/contract data - Access restricted to authenticated users to protect business relationships and contract details';