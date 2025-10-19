import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseMarcoZeroRecenteProps {
  loteId?: string;
  rodoviaId?: string;
}

/**
 * Hook para verificar se existe um Marco Zero recente (últimas 24h)
 * para o lote e rodovia especificados
 */
export function useMarcoZeroRecente({ loteId, rodoviaId }: UseMarcoZeroRecenteProps) {
  return useQuery({
    queryKey: ["marco-zero-recente", loteId, rodoviaId],
    queryFn: async () => {
      if (!loteId || !rodoviaId) return null;

      const vinteQuatroHorasAtras = new Date();
      vinteQuatroHorasAtras.setHours(vinteQuatroHorasAtras.getHours() - 24);

      const { data, error } = await supabase
        .from("marcos_inventario")
        .select("*")
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId)
        .eq("tipo", "marco_zero")
        .gte("created_at", vinteQuatroHorasAtras.toISOString())
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!loteId && !!rodoviaId,
  });
}
