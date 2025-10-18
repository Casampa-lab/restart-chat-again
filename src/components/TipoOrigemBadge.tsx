import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TipoOrigemBadgeProps {
  tipoOrigem?: string | null;
  modificadoPorIntervencao?: boolean;
  className?: string;
  showLabel?: boolean;
}

/**
 * Badge visual para identificar o tipo de origem/intervenção
 * Conforme Addendum Técnico VABLE:
 * 🟢 Verde - Execução de Projeto
 * 🟡 Amarelo - Manutenção Pré-Projeto
 * ⚪ Branco - Cadastro Inicial
 */
export function TipoOrigemBadge({ 
  tipoOrigem, 
  modificadoPorIntervencao,
  className,
  showLabel = true 
}: TipoOrigemBadgeProps) {
  // Se não foi modificado por intervenção, é cadastro inicial
  if (!modificadoPorIntervencao || !tipoOrigem) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "border-gray-300 bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300",
          className
        )}
      >
        ⚪ {showLabel && "Cadastro Inicial"}
      </Badge>
    );
  }

  // Manutenção pré-projeto
  if (tipoOrigem === 'manutencao_pre_projeto') {
    return (
      <Badge 
        variant="secondary"
        className={cn(
          "border-yellow-500 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
          className
        )}
      >
        🟡 {showLabel && "Manutenção Pré-Projeto"}
      </Badge>
    );
  }

  // Execução de projeto
  return (
    <Badge 
      variant="default"
      className={cn(
        "border-green-500 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        className
      )}
    >
      🟢 {showLabel && "Execução"}
    </Badge>
  );
}

/**
 * Versão compacta do badge (apenas emoji)
 */
export function TipoOrigemIcon({ tipoOrigem, modificadoPorIntervencao }: TipoOrigemBadgeProps) {
  if (!modificadoPorIntervencao || !tipoOrigem) return <span title="Cadastro Inicial">⚪</span>;
  if (tipoOrigem === 'manutencao_pre_projeto') return <span title="Manutenção Pré-Projeto">🟡</span>;
  return <span title="Execução de Projeto">🟢</span>;
}
