import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useWorkSession } from "./useWorkSession";
import { getConfig, type GrupoElemento } from "@/lib/reconciliacaoConfig";

export function useNotificacoesCoordenador() {
  const { user } = useAuth();
  const { activeSession } = useWorkSession(user?.id);

  // 1. Notificações não lidas (sistema de mensagens)
  const { data: notificacoesNaoLidas = 0 } = useQuery({
    queryKey: ['notificacoes-nao-lidas'],
    queryFn: async () => {
      const { data } = await supabase
        .from('notificacoes')
        .select('id')
        .eq('lida', false);
      return data?.length || 0;
    },
    enabled: !!user,
    refetchInterval: 30000
  });

  // 2. Elementos não cadastrados pendentes de aprovação
  const { data: elementosPendentes = 0 } = useQuery({
    queryKey: ['contador-elementos-pendentes'],
    queryFn: async () => {
      const { count } = await supabase
        .from('elementos_pendentes_aprovacao')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente_aprovacao');
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000
  });

  // 3. DIVERGÊNCIAS PENDENTES DE RECONCILIAÇÃO (273 da tela)
  const { data: divergenciasPendentes = 0 } = useQuery({
    queryKey: ['count-divergencias-coordenacao', activeSession?.lote_id, activeSession?.rodovia_id],
    queryFn: async () => {
      if (!activeSession) return 0;
      
      const gruposElementos: GrupoElemento[] = [
        'placas', 'defensas', 'porticos', 
        'marcas_longitudinais', 'inscricoes', 'cilindros', 'tachas'
      ];
      
      let totalDivergencias = 0;
      
      for (const grupo of gruposElementos) {
        const config = getConfig(grupo);
        
        const { count } = await supabase
          .from(config.tabelaNecessidades as any)
          .select(`
            id,
            reconciliacao:reconciliacoes!inner(status)
          `, {
            count: 'exact',
            head: true
          })
          .eq('divergencia', true)
          .eq('reconciliacao.status', 'pendente_aprovacao')
          .eq('lote_id', activeSession.lote_id)
          .eq('rodovia_id', activeSession.rodovia_id);
        
        totalDivergencias += count || 0;
      }
      
      return totalDivergencias;
    },
    enabled: !!user && !!activeSession,
    refetchInterval: 30000,
    staleTime: 0,
    gcTime: 0
  });

  // 4. Intervenções pendentes de aprovação
  const { data: intervencoesPendentes = 0 } = useQuery({
    queryKey: ['count-intervencoes-aprovacao'],
    queryFn: async () => {
      const tabelas = [
        'ficha_marcas_longitudinais_intervencoes',
        'ficha_cilindros_intervencoes',
        'ficha_porticos_intervencoes',
        'defensas_intervencoes',
        'ficha_inscricoes_intervencoes',
        'ficha_tachas_intervencoes',
        'ficha_placa_intervencoes'
      ];
      
      let totalPendentes = 0;
      for (const tabela of tabelas) {
        const { count } = await supabase
          .from(tabela as any)
          .select('*', { count: 'exact', head: true })
          .eq('pendente_aprovacao_coordenador', true);
        totalPendentes += count || 0;
      }
      return totalPendentes;
    },
    enabled: !!user,
    refetchInterval: 30000
  });

  const totalPendencias = 
    notificacoesNaoLidas + 
    elementosPendentes + 
    divergenciasPendentes + 
    intervencoesPendentes;

  return {
    totalPendencias,
    notificacoesNaoLidas,
    elementosPendentes,
    divergenciasPendentes,
    intervencoesPendentes,
    loading: false
  };
}
