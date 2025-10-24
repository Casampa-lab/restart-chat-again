-- Fase 1: Adicionar campos de status às tabelas de retrorefletividade
ALTER TABLE public.retrorrefletividade_estatica
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'rascunho',
  ADD COLUMN IF NOT EXISTS enviado_coordenador_em TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS aprovado_coordenador_em TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS aprovado_por UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS observacao_coordenador TEXT;

ALTER TABLE public.retrorrefletividade_dinamica
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'rascunho',
  ADD COLUMN IF NOT EXISTS enviado_coordenador_em TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS aprovado_coordenador_em TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS aprovado_por UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS observacao_coordenador TEXT;

-- Fase 2: Criar função para notificar coordenadores sobre retrorefletividades enviadas
CREATE OR REPLACE FUNCTION public.notificar_coordenadores_retrorrefletividade()
RETURNS TRIGGER AS $$
DECLARE
  coordenador_record RECORD;
  tipo_medicao TEXT;
BEGIN
  -- Só notifica se status mudou para 'pendente_aprovacao_coordenador'
  IF NEW.status = 'pendente_aprovacao_coordenador' AND 
     (OLD.status IS NULL OR OLD.status != 'pendente_aprovacao_coordenador') THEN
    
    -- Define tipo de medição
    tipo_medicao := CASE TG_TABLE_NAME
      WHEN 'retrorrefletividade_estatica' THEN 'Retrorefletividade Estática'
      WHEN 'retrorrefletividade_dinamica' THEN 'Retrorefletividade Dinâmica'
    END;
    
    -- Busca todos coordenadores ativos
    FOR coordenador_record IN 
      SELECT DISTINCT ur.user_id
      FROM user_roles ur
      WHERE ur.role IN ('coordenador', 'admin')
    LOOP
      -- Cria notificação para cada coordenador
      INSERT INTO public.notificacoes (
        user_id,
        tipo,
        titulo,
        mensagem,
        lida,
        created_at
      ) VALUES (
        coordenador_record.user_id,
        'retrorrefletividade_pendente',
        tipo_medicao || ' Pendente',
        'Nova medição de ' || tipo_medicao || ' enviada para aprovação.',
        false,
        NOW()
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers para ambas tabelas
DROP TRIGGER IF EXISTS trigger_notificar_coordenadores_retro_estatica ON public.retrorrefletividade_estatica;
CREATE TRIGGER trigger_notificar_coordenadores_retro_estatica
  AFTER UPDATE ON public.retrorrefletividade_estatica
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_coordenadores_retrorrefletividade();

DROP TRIGGER IF EXISTS trigger_notificar_coordenadores_retro_dinamica ON public.retrorrefletividade_dinamica;
CREATE TRIGGER trigger_notificar_coordenadores_retro_dinamica
  AFTER UPDATE ON public.retrorrefletividade_dinamica
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_coordenadores_retrorrefletividade();