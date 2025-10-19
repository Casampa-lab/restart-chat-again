-- Adicionar coluna SNV à tabela nao_conformidades
ALTER TABLE public.nao_conformidades 
ADD COLUMN IF NOT EXISTS snv TEXT;