import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Notificacao {
  id: string;
  user_id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  elemento_pendente_id: string | null;
  nc_id: string | null;
  created_at: string;
}

export function useNotificacoes() {
  const { data: notificacoes = [], refetch } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as Notificacao[];
    }
  });

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  const marcarComoLida = async (id: string) => {
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('id', id);
    
    if (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
    refetch();
  };

  const marcarTodasComoLidas = async () => {
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('lida', false);
    
    if (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
    refetch();
  };

  return { 
    notificacoes, 
    naoLidas, 
    marcarComoLida, 
    marcarTodasComoLidas,
    refetch 
  };
}
