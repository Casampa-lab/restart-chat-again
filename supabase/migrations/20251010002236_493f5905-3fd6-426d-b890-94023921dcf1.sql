-- Apagar os registros de ficha_placa da BR-367 Lote 04
DELETE FROM public.ficha_placa 
WHERE rodovia_id = '37a1dbe7-0056-42d3-a92c-fe5bc73af52e' 
  AND lote_id = 'df776e07-d57d-4403-85eb-2d6e0916f5d8';