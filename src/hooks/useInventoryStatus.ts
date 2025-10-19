import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface InventoryCount {
  tipo: string;
  tabela: string;
  total: number;
  importado: boolean; // Se foi feita importação (mesmo que vazia)
}

interface MarcoZeroData {
  existe: boolean;
  data?: string;
  totalConsolidado?: number;
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
  const inventoryCounts = useQuery<InventoryCount[]>({
    queryKey: ["inventory-status", loteId, rodoviaId],
    queryFn: async () => {
      if (!loteId || !rodoviaId) return [];
      
      // Buscar contagens de todas as tabelas de inventário e logs de importação
      const queries = INVENTORY_TYPES.map(async (invType) => {
        // Contar registros na tabela de inventário
        const { count } = await supabase
          .from(invType.table as any)
          .select("*", { count: "exact", head: true })
          .eq("lote_id", loteId)
          .eq("rodovia_id", rodoviaId);
        
        // Verificar se há log de importação (mesmo que vazia)
        const { data: logData } = await supabase
          .from('importacoes_log')
          .select('total_registros')
          .eq('lote_id', loteId)
          .eq('rodovia_id', rodoviaId)
          .eq('tipo_inventario', invType.value)
          .maybeSingle();
        
        return {
          tipo: invType.value,
          tabela: invType.table,
          total: count || 0,
          importado: !!logData, // true se existe log de importação
        } as InventoryCount;
      });
      
      return Promise.all(queries);
    },
    enabled: !!loteId && !!rodoviaId,
  });

  // Query para verificar Marco Zero
  const marcoZero = useQuery<MarcoZeroData>({
    queryKey: ["marco-zero-status", loteId, rodoviaId],
    queryFn: async () => {
      if (!loteId || !rodoviaId) return { existe: false };
      
      const { data } = await supabase
        .from("vw_inventario_consolidado")
        .select("data_marco, total_geral")
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId)
        .maybeSingle();
      
      return {
        existe: !!data,
        data: data?.data_marco,
        totalConsolidado: data?.total_geral,
      };
    },
    enabled: !!loteId && !!rodoviaId,
  });

  return { 
    inventoryCounts, 
    marcoZero 
  };
}

export function getStatusIndicator(total: number, importado: boolean) {
  if (!importado) return { icon: "🔴", color: "text-red-500", label: "Não importado" };
  if (total === 0) return { icon: "🔵", color: "text-blue-500", label: "Importado vazio" };
  if (total < 50) return { icon: "🟡", color: "text-yellow-500", label: "Parcial" };
  return { icon: "🟢", color: "text-green-500", label: `${total} registros` };
}
