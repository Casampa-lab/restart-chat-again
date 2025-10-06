-- Add deleted column to nao_conformidades table for soft delete
ALTER TABLE public.nao_conformidades 
ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT false;