import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2 } from "lucide-react";

interface ConsolidatedInventoryBadgeProps {
  total: number;
  dataMarcoZero: Date;
}

export function ConsolidatedInventoryBadge({ 
  total, 
  dataMarcoZero 
}: ConsolidatedInventoryBadgeProps) {
  return (
    <Badge 
      variant="default" 
      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm font-semibold"
    >
      <CheckCircle2 className="h-4 w-4 mr-1.5" />
      {total} elementos
      <span className="ml-2 opacity-90 text-xs">
        (Baseline {format(dataMarcoZero, "dd/MM/yyyy", { locale: ptBR })})
      </span>
    </Badge>
  );
}
