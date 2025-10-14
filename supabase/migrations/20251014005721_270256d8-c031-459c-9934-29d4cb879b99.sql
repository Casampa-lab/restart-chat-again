-- Padronizar campo de data em defensas para data_vistoria
ALTER TABLE public.defensas 
  RENAME COLUMN data_inspecao TO data_vistoria;

-- Atualizar comentário
COMMENT ON COLUMN public.defensas.data_vistoria IS 'Data da vistoria/inspeção da defensa';