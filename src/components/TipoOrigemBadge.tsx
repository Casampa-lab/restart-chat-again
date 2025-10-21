import { Badge } from "@/components/ui/badge";
import { Wrench, HardHat, Package, Cpu, Pencil } from "lucide-react";

interface TipoOrigemBadgeProps {
  tipoOrigem?: string;
  modificadoPorIntervencao?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function TipoOrigemBadge({ 
  tipoOrigem = "cadastro_inicial", 
  modificadoPorIntervencao = false,
  showLabel = true,
  className 
}: TipoOrigemBadgeProps) {
  // Se foi modificado por intervenção, mostrar badge específico
  if (modificadoPorIntervencao) {
    return (
      <Badge variant="outline" className={`border-orange-500 text-orange-700 ${className}`}>
        <Pencil className="h-3 w-3 mr-1" />
        {showLabel && "Modificado"}
      </Badge>
    );
  }

  const configs = {
    cadastro_inicial: {
      icon: Package,
      label: "Cadastro Inicial",
      variant: "secondary" as const,
      color: "text-muted-foreground",
    },
    execucao: {
      icon: HardHat,
      label: "Execução",
      variant: "default" as const,
      color: "text-green-600",
    },
    manutencao_pre_projeto: {
      icon: Wrench,
      label: "Manutenção",
      variant: "outline" as const,
      color: "text-yellow-600",
    },
    sistema_match: {
      icon: Cpu,
      label: "Sistema/Match",
      variant: "secondary" as const,
      color: "text-blue-600",
    },
  };

  const config = configs[tipoOrigem as keyof typeof configs] || configs.cadastro_inicial;
  const Icon = config.icon;

  // Se não mostrar label, retornar apenas o ícone sem Badge
  if (!showLabel) {
    return (
      <div className={className}>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
    );
  }

  // Com label, usar Badge normal
  return (
    <Badge variant={config.variant} className={className}>
      <Icon className={`h-3 w-3 mr-1 ${config.color}`} />
      {config.label}
    </Badge>
  );
}
