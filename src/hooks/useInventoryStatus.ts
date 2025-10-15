import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface InventoryCount {
  tipo: string;
  tabela: string;
  total: number;
}

const INVENTORY_TYPES = [
  { value: "placas", label: "Placas de Sinalização", table: "ficha_placa" },
  { value: "cilindros", label: "Cilindros Delimitadores", table: "ficha_cilindros" },
  { value: "marcas_longitudinais", label: "Marcas Longitudinais", table: "ficha_marcas_longitudinais" },
  { value: "defensas", label: "Defensas Metálicas", table: "defensas" },
  { value: "porticos", label: "Pórticos", table: "ficha_porticos" },
  { value: "tachas", label: "Tachas Refletivas", table: "ficha_tachas" },
  { value: "inscricoes", label: "Inscrições/Zebrados", table: "ficha_inscricoes" },
];

export function useInventoryStatus(
  loteId?: string,
  rodoviaId?: string
) {
  return useQuery<InventoryCount[]>({
    queryKey: ["inventory-status", loteId, rodoviaId],
    queryFn: async () => {
      if (!loteId || !rodoviaId) return [];
      
      // Buscar contagens de todas as tabelas de inventário
      const queries = INVENTORY_TYPES.map(async (invType) => {
        const { count } = await supabase
          .from(invType.table as any)
          .select("*", { count: "exact", head: true })
          .eq("lote_id", loteId)
          .eq("rodovia_id", rodoviaId);
        
        return {
          tipo: invType.value,
          tabela: invType.table,
          total: count || 0,
        } as InventoryCount;
      });
      
      return Promise.all(queries);
    },
    enabled: !!loteId && !!rodoviaId,
  });
}

export function getStatusIndicator(total: number) {
  if (total === 0) return { icon: "🔴", color: "text-red-500", label: "Não importado" };
  if (total < 50) return { icon: "🟡", color: "text-yellow-500", label: "Parcial" };
  return { icon: "🟢", color: "text-green-500", label: `${total} registros` };
}
