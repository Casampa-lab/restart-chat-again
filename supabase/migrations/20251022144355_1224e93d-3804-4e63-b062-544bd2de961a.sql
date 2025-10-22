-- Corrigir inversão de coordenadas em necessidades_defensas
-- Problema: latitude_inicial e latitude_final estão NULL, enquanto
-- longitude_inicial contém valor de latitude e longitude_final contém valor de longitude correto
UPDATE necessidades_defensas
SET
  latitude_inicial = longitude_final,    -- Valor correto de latitude estava em longitude_final
  latitude_final = longitude_inicial,    -- Valor correto de latitude estava em longitude_inicial
  longitude_inicial = latitude_inicial,  -- NULL → mantém NULL temporariamente
  longitude_final = latitude_final       -- NULL → mantém NULL temporariamente
WHERE latitude_inicial IS NULL 
  AND latitude_final IS NULL
  AND longitude_inicial IS NOT NULL
  AND longitude_final IS NOT NULL;

-- Agora corrigir os valores NULL que ficaram em longitude
-- (eram os valores corretos de longitude que estavam nas posições erradas)
UPDATE necessidades_defensas
SET
  longitude_inicial = latitude_inicial,  -- Recupera valor de longitude
  longitude_final = latitude_final       -- Recupera valor de longitude
WHERE longitude_inicial IS NULL 
  AND longitude_final IS NULL
  AND latitude_inicial IS NOT NULL
  AND latitude_final IS NOT NULL;

-- Comentário: Esta migration corrige o problema de coordenadas invertidas
-- onde latitudes estavam em colunas de longitude e vice-versa