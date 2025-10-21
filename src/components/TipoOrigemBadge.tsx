import { Badge } from "@/components/ui/badge";

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
    if (!showLabel) {
      return (
        <div className={`inline-flex items-center justify-center ${className}`}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <circle cx="6" cy="6" r="5" className="fill-orange-600" />
          </svg>
        </div>
      );
    }
    return (
      <Badge variant="outline" className={`border-orange-500 text-orange-700 ${className}`}>
        <svg width="12" height="12" viewBox="0 0 12 12" className="mr-1">
          <circle cx="6" cy="6" r="5" className="fill-orange-600" />
        </svg>
        Modificado
      </Badge>
    );
  }

  const configs = {
    cadastro_inicial: {
      label: "Cadastro Inicial",
      variant: "secondary" as const,
      color: "fill-gray-400",
    },
    execucao: {
      label: "Execução",
      variant: "default" as const,
      color: "fill-green-600",
    },
    manutencao_pre_projeto: {
      label: "Manutenção",
      variant: "outline" as const,
      color: "fill-yellow-600",
    },
    sistema_match: {
      label: "Sistema/Match",
      variant: "secondary" as const,
      color: "fill-blue-600",
    },
    necessidade: {
      label: "Criado por Match",
      variant: "secondary" as const,
      color: "fill-purple-600",
    },
    aguardando_reconciliacao: {
      label: "Aguardando Reconciliação",
      variant: "outline" as const,
      color: "fill-yellow-500",
    },
  };

  const config = configs[tipoOrigem as keyof typeof configs] || configs.cadastro_inicial;

  // Se não mostrar label, retornar apenas a bolinha
  if (!showLabel) {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <svg width="12" height="12" viewBox="0 0 12 12">
          <circle cx="6" cy="6" r="5" className={config.color} />
        </svg>
      </div>
    );
  }

  // Com label, usar Badge com bolinha
  return (
    <Badge variant={config.variant} className={className}>
      <svg width="12" height="12" viewBox="0 0 12 12" className="mr-1">
        <circle cx="6" cy="6" r="5" className={config.color} />
      </svg>
      {config.label}
    </Badge>
  );
}
