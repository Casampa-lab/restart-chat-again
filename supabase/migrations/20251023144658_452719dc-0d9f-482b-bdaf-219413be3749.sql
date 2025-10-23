-- Corrigir função remover_duplicatas_necessidades com nomes corretos de colunas
CREATE OR REPLACE FUNCTION public.remover_duplicatas_necessidades(p_tabela TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_query TEXT;
  v_removed INTEGER := 0;
  v_partition_cols TEXT;
BEGIN
  -- Definir colunas de partição baseado na tabela
  v_partition_cols := CASE p_tabela
    WHEN 'necessidades_marcas_longitudinais' THEN 'rodovia_id, COALESCE(km_inicial, 0), COALESCE(km_final, 0), COALESCE(posicao, ''''), COALESCE(tipo_demarcacao, ''''), servico'
    WHEN 'necessidades_marcas_transversais' THEN 'rodovia_id, COALESCE(km_inicial, 0), COALESCE(km_final, 0), COALESCE(sigla, ''''), COALESCE(tipo_inscricao, ''''), servico'
    WHEN 'necessidades_tachas' THEN 'rodovia_id, COALESCE(km_inicial, 0), COALESCE(km_final, 0), COALESCE(tipo_tacha, ''''), COALESCE(cor, ''''), servico'
    WHEN 'necessidades_cilindros' THEN 'rodovia_id, COALESCE(km_inicial, 0), COALESCE(km_final, 0), COALESCE(cor_corpo, ''''), COALESCE(cor_refletivo, ''''), servico'
    WHEN 'necessidades_placas' THEN 'rodovia_id, COALESCE(km_inicial, 0), COALESCE(codigo, ''''), COALESCE(tipo, ''''), COALESCE(lado, ''''), servico'
    WHEN 'necessidades_porticos' THEN 'rodovia_id, COALESCE(km_inicial, 0), COALESCE(tipo, ''''), COALESCE(vao_horizontal_m, 0), servico'
    WHEN 'necessidades_defensas' THEN 'rodovia_id, COALESCE(km_inicial, 0), COALESCE(km_final, 0), COALESCE(tipo_defensa, ''''), COALESCE(lado, ''''), servico'
    ELSE 'id'
  END;
  
  -- Construir query dinâmica para remover duplicatas mantendo o registro mais antigo
  v_query := format('
    DELETE FROM %I
    WHERE id IN (
      SELECT id FROM (
        SELECT 
          id,
          ROW_NUMBER() OVER (
            PARTITION BY %s
            ORDER BY created_at ASC, id ASC
          ) as rn
        FROM %I
      ) t
      WHERE rn > 1
    )
  ', p_tabela, v_partition_cols, p_tabela);
  
  EXECUTE v_query;
  GET DIAGNOSTICS v_removed = ROW_COUNT;
  
  RETURN v_removed;
END;
$$;