-- Add motivo column to necessidades_porticos
ALTER TABLE public.necessidades_porticos 
ADD COLUMN IF NOT EXISTS motivo text;