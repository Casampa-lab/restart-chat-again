import { TipoOrigemBadge } from "./TipoOrigemBadge";
import { StatusReconciliacaoBadge } from "./StatusReconciliacaoBadge";

interface OrigemReconciliacaoBadgesProps {
  origem: string;
  reconciliacaoInfo?: {
    reconciliado: boolean;
    tipo_match?: 'exato' | 'alto' | 'parcial';
  };
  modificadoPorIntervencao?: boolean;
  showLabel?: boolean;
}

export function OrigemReconciliacaoBadges({ 
  origem, 
  reconciliacaoInfo,
  modificadoPorIntervencao = false,
  showLabel = false 
}: OrigemReconciliacaoBadgesProps) {
  return (
    <div className="flex items-center gap-0.5">
      <TipoOrigemBadge 
        tipoOrigem={origem} 
        modificadoPorIntervencao={modificadoPorIntervencao}
        showLabel={showLabel}
      />
      
      {/* Só renderiza segunda bolinha se for cadastro_inicial COM reconciliação */}
      {origem === 'cadastro_inicial' && reconciliacaoInfo && (
        <StatusReconciliacaoBadge 
          reconciliacaoInfo={reconciliacaoInfo}
          showLabel={showLabel}
        />
      )}
    </div>
  );
}
