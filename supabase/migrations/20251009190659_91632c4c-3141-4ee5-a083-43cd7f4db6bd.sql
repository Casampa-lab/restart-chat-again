-- Reverter Lote 08 de volta para Lote 05
UPDATE public.lotes 
SET numero = '05' 
WHERE numero = '08' AND id = '824c1a79-693e-4294-891c-8beb411087be';