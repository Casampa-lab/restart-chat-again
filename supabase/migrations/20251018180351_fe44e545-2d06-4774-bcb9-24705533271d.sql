-- Copiar informação de descrição para refletivo nas necessidades_tachas
-- Extrair apenas "Bidirecional" ou "Monodirecional" removendo "Tacha "

UPDATE public.necessidades_tachas
SET refletivo = CASE
  WHEN descricao ILIKE '%bidirecional%' THEN 'Bidirecional'
  WHEN descricao ILIKE '%monodirecional%' THEN 'Monodirecional'
  ELSE refletivo
END
WHERE descricao IS NOT NULL 
  AND (descricao ILIKE '%bidirecional%' OR descricao ILIKE '%monodirecional%');