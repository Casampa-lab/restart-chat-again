import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SolucaoBadgeProps {
  solucao: string | null;
}

export function SolucaoBadge({ solucao }: SolucaoBadgeProps) {
  if (!solucao) return null;

  const config = {
    'Implantar': {
      color: "bg-blue-100 text-blue-800 border-blue-300",
      icon: "➕",
      label: "Implantar - Elemento novo previsto no projeto"
    },
    'Substituir': {
      color: "bg-yellow-100 text-yellow-800 border-yellow-300",
      icon: "🔄",
      label: "Substituir - Atualização de elemento existente"
    },
    'Remover': {
      color: "bg-red-100 text-red-800 border-red-300",
      icon: "🗑️",
      label: "Remover - Previsto para remoção no projeto"
    }
  };

  const item = config[solucao as keyof typeof config];
  if (!item) return <Badge variant="outline">{solucao}</Badge>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge className={`${item.color} text-xs border font-medium`}>
            {item.icon} {solucao}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{item.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
