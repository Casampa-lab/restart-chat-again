-- Corrigir km_final NULL em necessidades_tachas
-- Para tachas pontuais, km_final = km_inicial + extensao
UPDATE necessidades_tachas
SET km_final = km_inicial + COALESCE(extensao_km, 0)
WHERE km_final IS NULL;

-- Corrigir tipo_defensa NULL em necessidades_defensas
-- Inferir tipo da descrição da solução
UPDATE necessidades_defensas 
SET tipo_defensa = 
  CASE 
    WHEN solucao_planilha LIKE '%Simples%' THEN 'Defensa Simples'
    WHEN solucao_planilha LIKE '%Dupla%' THEN 'Defensa Dupla'
    WHEN solucao_planilha LIKE '%New Jersey%' THEN 'New Jersey'
    ELSE 'Defensa Simples'
  END
WHERE tipo_defensa IS NULL;