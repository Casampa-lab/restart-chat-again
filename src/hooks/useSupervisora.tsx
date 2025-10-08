import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface SupervisoraConfig {
  id: string;
  nome_empresa: string;
  logo_url: string | null;
  usar_logo_customizado: boolean;
  codigo_convite: string | null;
  created_at: string;
  updated_at: string;
}

export const useSupervisora = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["supervisora", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Buscar supervisora do usuário via profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("supervisora_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.supervisora_id) return null;

      // Buscar dados da supervisora
      const { data, error } = await supabase
        .from("supervisoras")
        .select("*")
        .eq("id", profile.supervisora_id)
        .single();

      if (error) throw error;
      return data as SupervisoraConfig | null;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });
};
