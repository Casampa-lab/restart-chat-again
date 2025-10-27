-- Remover tabelas legacy de intervenções (não mais utilizadas)
-- As tabelas ficha_*_intervencoes substituíram completamente estas tabelas

DROP TABLE IF EXISTS public.intervencoes_cilindros CASCADE;
DROP TABLE IF EXISTS public.intervencoes_inscricoes CASCADE;
DROP TABLE IF EXISTS public.intervencoes_porticos CASCADE;
DROP TABLE IF EXISTS public.intervencoes_sh CASCADE;
DROP TABLE IF EXISTS public.intervencoes_sv CASCADE;
DROP TABLE IF EXISTS public.intervencoes_tacha CASCADE;

-- Limpar registros de auditoria dessas tabelas removidas
DELETE FROM public.audit_intervencoes_report 
WHERE table_name IN (
  'intervencoes_cilindros',
  'intervencoes_inscricoes', 
  'intervencoes_porticos',
  'intervencoes_sh',
  'intervencoes_sv',
  'intervencoes_tacha'
);

DELETE FROM public.audit_intervencoes_recommendations
WHERE table_name IN (
  'intervencoes_cilindros',
  'intervencoes_inscricoes',
  'intervencoes_porticos', 
  'intervencoes_sh',
  'intervencoes_sv',
  'intervencoes_tacha'
);