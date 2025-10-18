-- Migração para corrigir dados de tachas: mover valores de refletivo para tipo_refletivo
-- A coluna refletivo existe em ficha_tachas e necessidades_tachas, mas não em ficha_tachas_intervencoes

-- Passo 1: Copiar dados de refletivo para tipo_refletivo (somente se refletivo contém valores NBR)
UPDATE public.ficha_tachas
SET tipo_refletivo = CASE 
  WHEN refletivo IN ('I', 'II', 'III', 'IV', 'VII', 'IX', 'X') THEN refletivo
  ELSE tipo_refletivo
END
WHERE refletivo IN ('I', 'II', 'III', 'IV', 'VII', 'IX', 'X');

-- Passo 2: Limpar campo refletivo onde ele tinha valores NBR (para receber Bidirecional/Monodirecional)
UPDATE public.ficha_tachas
SET refletivo = NULL
WHERE refletivo IN ('I', 'II', 'III', 'IV', 'VII', 'IX', 'X');

-- Fazer o mesmo para necessidades_tachas
UPDATE public.necessidades_tachas
SET tipo_refletivo = CASE 
  WHEN refletivo IN ('I', 'II', 'III', 'IV', 'VII', 'IX', 'X') THEN refletivo
  ELSE tipo_refletivo
END
WHERE refletivo IN ('I', 'II', 'III', 'IV', 'VII', 'IX', 'X');

UPDATE public.necessidades_tachas
SET refletivo = NULL
WHERE refletivo IN ('I', 'II', 'III', 'IV', 'VII', 'IX', 'X');