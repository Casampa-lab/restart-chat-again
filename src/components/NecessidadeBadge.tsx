import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PlusCircle, RefreshCw, Trash2, CheckCircle2 } from "lucide-react";

interface NecessidadeBadgeProps {
  necessidade: {
    id: string;
    servico: "Implantar" | "Substituir" | "Remover" | "Manter";
    distancia_match_metros: number | null;
    codigo?: string;
    tipo?: string;
    km?: number;
  };
  tipo: "placas" | "porticos" | "cilindros" | "marcas_longitudinais" | "tachas" | "defensas";
}

const SERVICO_CONFIG = {
  Implantar: { 
    icon: PlusCircle, 
    label: "Implantar",
  },
  Substituir: { 
    icon: RefreshCw, 
    label: "Substituir",
  },
  Remover: { 
    icon: Trash2, 
    label: "Remover",
  },
  Manter: { 
    icon: CheckCircle2, 
    label: "Manter",
  }
};

function getMatchLevel(distancia: number | null): "confirmado" | "provavel" {
  if (distancia === null || distancia === 0) return "confirmado";
  if (distancia <= 10) return "confirmado";
  return "provavel"; // 10-20m
}

function getMatchColorClasses(servico: string, matchLevel: "confirmado" | "provavel"): string {
  if (matchLevel === "provavel") {
    // Todos os matches prováveis ficam amarelos
    return "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200";
  }
  
  // Match confirmado - cores por tipo de serviço
  const colorMap = {
    Implantar: "bg-green-100 text-green-800 border-green-300 hover:bg-green-200",
    Substituir: "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200",
    Remover: "bg-red-100 text-red-800 border-red-300 hover:bg-red-200",
    Manter: "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200"
  };
  
  return colorMap[servico as keyof typeof colorMap] || colorMap.Implantar;
}

export function NecessidadeBadge({ necessidade, tipo }: NecessidadeBadgeProps) {
  const navigate = useNavigate();
  const config = SERVICO_CONFIG[necessidade.servico];
  const Icon = config.icon;
  const matchLevel = getMatchLevel(necessidade.distancia_match_metros);
  const colorClasses = getMatchColorClasses(necessidade.servico, matchLevel);
  const distancia = necessidade.distancia_match_metros || 0;

  const handleClick = () => {
    navigate(`/minhas-necessidades?tipo=${tipo}&highlight=${necessidade.id}`);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            className={`${colorClasses} cursor-pointer transition-all text-xs gap-1 border`}
            onClick={handleClick}
          >
            <Icon className="h-3 w-3" />
            {necessidade.servico}
            {distancia > 0 && (
              <span className="text-[10px] opacity-80">
                ({distancia.toFixed(0)}m)
              </span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p className="font-semibold">{necessidade.servico} previsto em projeto</p>
            {necessidade.codigo && <p><strong>Código:</strong> {necessidade.codigo}</p>}
            {necessidade.tipo && <p><strong>Tipo:</strong> {necessidade.tipo}</p>}
            {necessidade.km && <p><strong>KM:</strong> {necessidade.km.toFixed(2)}</p>}
            
            <div className="pt-1">
              {matchLevel === "confirmado" ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 text-[10px]">
                  ✓ Match Confirmado ({distancia.toFixed(0)}m)
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-[10px]">
                  ⚠ Match Provável (~{distancia.toFixed(0)}m) - Verificar no local
                </Badge>
              )}
            </div>
            
            <p className="text-muted-foreground pt-1 text-[10px]">Clique para ver detalhes</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
