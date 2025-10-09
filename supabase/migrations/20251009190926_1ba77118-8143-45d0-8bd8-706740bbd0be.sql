-- Reverter Lote 12 de volta para Lote 04
UPDATE public.lotes 
SET numero = '04' 
WHERE numero = '12' AND id = 'df776e07-d57d-4403-85eb-2d6e0916f5d8';