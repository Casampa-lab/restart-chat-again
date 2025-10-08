-- Fix profiles table RLS policies to ensure proper isolation and security
-- Drop existing SELECT policies to consolidate them
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Coordenadores veem profiles mesma supervisora" ON public.profiles;
DROP POLICY IF EXISTS "Admins veem todos profiles" ON public.profiles;

-- Create a consolidated SELECT policy with proper supervisora isolation
CREATE POLICY "Profiles SELECT access with supervisora isolation"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can always view their own profile
  auth.uid() = id
  OR
  -- Coordinators can view profiles in their supervisora for management purposes
  (
    has_role(auth.uid(), 'coordenador'::app_role) 
    AND supervisora_id IS NOT NULL 
    AND supervisora_id = get_user_supervisora_id(auth.uid())
  )
  OR
  -- Admins can view all profiles
  has_role(auth.uid(), 'admin'::app_role)
);

-- Ensure UPDATE policies are secure
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem atualizar qualquer profile" ON public.profiles;

-- Users can only update their own profile
CREATE POLICY "Users can update own profile only"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Ensure INSERT policy is secure
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile only"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Add comment for documentation
COMMENT ON TABLE public.profiles IS 'User profiles with supervisora isolation - coordinators can only view profiles within their own supervisora, users can only view their own profile';

-- Add NOT NULL constraint to supervisora_id for better security (with exception for system accounts)
-- This ensures proper isolation - we'll allow NULL for flexibility but the policy handles it
COMMENT ON COLUMN public.profiles.supervisora_id IS 'Supervisora affiliation - used for access control isolation';