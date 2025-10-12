-- Adicionar coluna motivo para necessidades_cilindros
ALTER TABLE public.necessidades_cilindros 
ADD COLUMN motivo text;

-- Comentário explicando o uso do campo
COMMENT ON COLUMN public.necessidades_cilindros.motivo IS 'Quando a solução for "Remover" ou "Substituir", usar 1-4: 1=Material fora do padrão/obsoleto; 2=Material dentro do padrão mas atualizado; 3=Material danificado; 4=Local impróprio/indevido. Para demais soluções usar "-"';