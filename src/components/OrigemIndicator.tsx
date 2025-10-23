import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface OrigemIndicatorProps {
  origem?: string;
  tipoOrigem?: string;
}

export function OrigemIndicator({ origem, tipoOrigem }: OrigemIndicatorProps) {
  // PRIORIDADE 1: Verificar SUBSTITUICAO primeiro (deve ser AZUL)
  const isSubstituicao = tipoOrigem === 'MATCH_SUBSTITUICAO';
  
  // PRIORIDADE 2: Verificar outros tipos
  const isConsolidado = origem === 'NECESSIDADE_CONSOLIDADA' && 
                        tipoOrigem === 'MATCH_CONFIRMADO';

  const isPendenteReconciliacao = origem === 'NECESSIDADE_PENDENTE_RECONCILIACAO' ||
                                   tipoOrigem === 'MATCH_AMBIGUO';

  const isErroProjetoPendente = origem === 'NECESSIDADE_COM_ERRO' ||
                                tipoOrigem === 'ERRO_PROJETO_PENDENTE';

  const isCadastro = origem === 'CADASTRO_ORIGINAL' || 
                     origem === 'CADASTRO' || 
                     tipoOrigem === 'LEVANTAMENTO_INICIAL' ||
                     tipoOrigem === 'cadastro_inicial';

  const isNecessidadeNova = origem === 'NECESSIDADE_NOVA' ||
                            tipoOrigem === 'INTERVENCAO_PLANEJADA';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`w-3 h-3 rounded-full ${
              isSubstituicao ? 'bg-blue-500 border-2 border-blue-600' :
              isConsolidado ? 'bg-green-500 border-2 border-green-600' :
              isPendenteReconciliacao ? 'bg-yellow-500 border-2 border-yellow-600' :
              isErroProjetoPendente ? 'bg-blue-500 border-2 border-blue-600' :
              isCadastro ? 'bg-gray-300 border-2 border-gray-400' : 
              isNecessidadeNova ? 'bg-blue-500 border-2 border-blue-600' :
              'bg-gray-200 border-2 border-gray-300'
            }`} 
          />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {isSubstituicao ? '🔵 Substituição (Remover + Implantar)' :
             isConsolidado ? '🟢 Match Consolidado (Cadastro + Necessidade)' :
             isPendenteReconciliacao ? '🟡 Match Ambíguo (Requer Reconciliação Manual)' :
             isErroProjetoPendente ? '🔵 Necessidade com Erro de Projeto (Aguardando Revisão)' :
             isCadastro ? '⚪ Cadastro Original (Sem Intervenção)' : 
             isNecessidadeNova ? '🔵 Necessidade Nova (Implantar)' :
             'Origem desconhecida'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
