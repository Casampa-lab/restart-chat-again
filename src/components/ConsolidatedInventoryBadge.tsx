import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConsolidatedInventoryBadgeProps {
  total: number;
  dataMarcoZero: Date;
}

export function ConsolidatedInventoryBadge({ 
  total, 
  dataMarcoZero 
}: ConsolidatedInventoryBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="default" 
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm font-semibold cursor-help"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            {total} elementos
            <Info className="h-3 w-3 ml-1.5 opacity-70" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">Inventário Consolidado</p>
          <p className="text-xs text-muted-foreground">
            Baseline: {format(dataMarcoZero, "dd/MM/yyyy", { locale: ptBR })}
          </p>
          <p className="text-xs mt-1">
            Inclui elementos cadastrados + execuções criadas automaticamente
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
