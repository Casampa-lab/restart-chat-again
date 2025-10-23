
-- Remover funções antigas de matching que estão causando conflito
DROP FUNCTION IF EXISTS public.match_pontual(p_tipo text, p_lat numeric, p_lon numeric, p_rodovia_id text, p_atributos jsonb, p_servico text);
DROP FUNCTION IF EXISTS public.match_linear(p_tipo text, p_geom_wkt text, p_rodovia_id text, p_atributos jsonb, p_servico text);
DROP FUNCTION IF EXISTS public.match_linear_km(p_tipo text, p_km_inicial numeric, p_km_final numeric, p_rodovia_id text, p_atributos jsonb, p_servico text);
