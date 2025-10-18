-- Separar sigla e tipo_inscricao quando vier no formato "SIGLA - Descrição"
UPDATE public.ficha_inscricoes
SET 
  sigla = TRIM(SPLIT_PART(tipo_inscricao, ' - ', 1)),
  tipo_inscricao = TRIM(SUBSTRING(tipo_inscricao FROM POSITION(' - ' IN tipo_inscricao) + 3))
WHERE tipo_inscricao LIKE '% - %'
  AND (sigla IS NULL OR sigla = '');