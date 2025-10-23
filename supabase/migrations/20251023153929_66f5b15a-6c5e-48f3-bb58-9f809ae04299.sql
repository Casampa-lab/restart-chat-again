
-- Limpeza de registros órfãos da BR-116 / Lote 99
-- Total: 834 registros distribuídos em 7 tabelas

-- Deletar de necessidades_placas (19 registros)
DELETE FROM necessidades_placas
WHERE rodovia_id = 'cc1a1c45-e34c-4536-b1ae-d56183e2c3b7'
  AND lote_id = 'cec865e7-c699-4277-9b54-cd0ba5773d02';

-- Deletar de necessidades_porticos (4 registros)
DELETE FROM necessidades_porticos
WHERE rodovia_id = 'cc1a1c45-e34c-4536-b1ae-d56183e2c3b7'
  AND lote_id = 'cec865e7-c699-4277-9b54-cd0ba5773d02';

-- Deletar de necessidades_marcas_transversais (186 registros)
DELETE FROM necessidades_marcas_transversais
WHERE rodovia_id = 'cc1a1c45-e34c-4536-b1ae-d56183e2c3b7'
  AND lote_id = 'cec865e7-c699-4277-9b54-cd0ba5773d02';

-- Deletar de necessidades_marcas_longitudinais (199 registros)
DELETE FROM necessidades_marcas_longitudinais
WHERE rodovia_id = 'cc1a1c45-e34c-4536-b1ae-d56183e2c3b7'
  AND lote_id = 'cec865e7-c699-4277-9b54-cd0ba5773d02';

-- Deletar de necessidades_tachas (200 registros)
DELETE FROM necessidades_tachas
WHERE rodovia_id = 'cc1a1c45-e34c-4536-b1ae-d56183e2c3b7'
  AND lote_id = 'cec865e7-c699-4277-9b54-cd0ba5773d02';

-- Deletar de necessidades_defensas (200 registros)
DELETE FROM necessidades_defensas
WHERE rodovia_id = 'cc1a1c45-e34c-4536-b1ae-d56183e2c3b7'
  AND lote_id = 'cec865e7-c699-4277-9b54-cd0ba5773d02';

-- Deletar de necessidades_cilindros (26 registros)
DELETE FROM necessidades_cilindros
WHERE rodovia_id = 'cc1a1c45-e34c-4536-b1ae-d56183e2c3b7'
  AND lote_id = 'cec865e7-c699-4277-9b54-cd0ba5773d02';
