-- Apagar TODOS os registros recentes de ficha_placa (últimas 24 horas)
DELETE FROM public.ficha_placa 
WHERE created_at >= NOW() - INTERVAL '24 hours';