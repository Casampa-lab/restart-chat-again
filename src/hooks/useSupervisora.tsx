import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SupervisoraConfig {
  id: string;
  nome_empresa: string;
  contrato: string;
  logo_url: string | null;
  usar_logo_customizado: boolean;
  created_at: string;
  updated_at: string;
}

export const useSupervisora = () => {
  return useQuery({
    queryKey: ["supervisora"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supervisora")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      return data as SupervisoraConfig | null;
    },
    staleTime: 0, // Sempre buscar dados atualizados
    refetchOnMount: true, // Atualizar ao montar componente
    refetchOnWindowFocus: true, // Atualizar quando a janela receber foco
  });
};
