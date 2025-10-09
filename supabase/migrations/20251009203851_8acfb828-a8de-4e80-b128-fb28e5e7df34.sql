-- Corrigir o nome da rodovia BR-135
UPDATE rodovias 
SET nome = 'BR-135' 
WHERE id = 'e606b6b7-eace-4ee0-9db9-3dc458ca7a23' AND codigo = 'BR-135';

-- Mover as 2080 placas importadas para a rodovia BR-116 correta
UPDATE ficha_placa 
SET rodovia_id = 'd91e026a-9d6f-4251-9d80-8923d1ed9b1e'
WHERE rodovia_id = 'e606b6b7-eace-4ee0-9db9-3dc458ca7a23' 
  AND lote_id = 'df776e07-d57d-4403-85eb-2d6e0916f5d8'
  AND user_id = '2dd65849-2bfe-45a2-845e-29d89308d65a';