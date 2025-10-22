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
      bgColor: "bg-gray-200",
      textColor: "text-black",
    },
    execucao: {
      icon: HardHat,
      label: "Execução",
      bgColor: "bg-green-500",
      textColor: "text-black",
    },
    manutencao_pre_projeto: {
      icon: Wrench,
      label: "Manutenção",
      bgColor: "bg-yellow-400",
      textColor: "text-black",
    },
    sistema_match: {
      icon: Cpu,
      label: "Sistema/Match",
      bgColor: "bg-blue-500",
      textColor: "text-black",
    },
  };

  const config = configs[tipoOrigem as keyof typeof configs] || configs.cadastro_inicial;
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={`${config.bgColor} ${config.textColor} border-0 ${className}`}
    >
      <Icon className="h-3 w-3 mr-1" />
      {showLabel && config.label}
    </Badge>
  );
}
