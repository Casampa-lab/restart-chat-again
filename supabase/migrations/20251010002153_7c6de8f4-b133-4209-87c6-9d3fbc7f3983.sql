-- Apagar os registros mais recentes de ficha_placa do Lote 04 BR-116
DELETE FROM public.ficha_placa 
WHERE rodovia_id = 'd91e026a-9d6f-4251-9d80-8923d1ed9b1e' 
  AND lote_id = 'df776e07-d57d-4403-85eb-2d6e0916f5d8'
  AND created_at >= NOW() - INTERVAL '2 hours';