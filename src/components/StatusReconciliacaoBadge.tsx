import { Badge } from "@/components/ui/badge";

interface StatusReconciliacaoBadgeProps {
  reconciliacaoInfo?: {
    reconciliado: boolean;
    tipo_match?: 'exato' | 'alto' | 'parcial';
  };
  showLabel?: boolean;
  className?: string;
}

export function StatusReconciliacaoBadge({ 
  reconciliacaoInfo,
  showLabel = true,
  className 
}: StatusReconciliacaoBadgeProps) {
  // Se não houver info de reconciliação, não renderizar nada
  if (!reconciliacaoInfo) {
    return null;
  }

  const { reconciliado, tipo_match } = reconciliacaoInfo;

  // Determinar configuração baseado no estado de reconciliação
  let config: {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    color: string;
  };

  if (!reconciliado) {
    // Aguardando decisão manual
    config = {
      label: "Aguardando Decisão",
      variant: "destructive" as const,
      color: "fill-red-600",
    };
  } else if (tipo_match === 'exato' || tipo_match === 'alto') {
    // Match automático
    config = {
      label: "Match Automático",
      variant: "default" as const,
      color: "fill-green-600",
    };
  } else if (tipo_match === 'parcial') {
    // Match manual
    config = {
      label: "Match Manual",
      variant: "secondary" as const,
      color: "fill-purple-600",
    };
  } else {
    // Estado desconhecido - não renderizar
    return null;
  }

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
