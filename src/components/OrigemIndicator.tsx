import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface OrigemIndicatorProps {
  origem?: string;
  tipoOrigem?: string;
}

export function OrigemIndicator({ origem, tipoOrigem }: OrigemIndicatorProps) {
  const isCadastro = origem === 'CADASTRO_ORIGINAL' || 
                     origem === 'CADASTRO' || 
                     tipoOrigem === 'LEVANTAMENTO_INICIAL' ||
                     tipoOrigem === 'cadastro_inicial';

  const isNecessidade = origem === 'NECESSIDADE_CONSOLIDADA' || 
                        origem === 'NECESSIDADE_NOVA' ||
                        origem === 'NECESSIDADE' ||
                        tipoOrigem === 'SUBSTITUICAO' ||
                        tipoOrigem === 'INTERVENCAO_PLANEJADA';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`w-3 h-3 rounded-full ${
              isCadastro ? 'bg-gray-300 border-2 border-gray-400' : 
              isNecessidade ? 'bg-blue-500 border-2 border-blue-600' :
              'bg-gray-200 border-2 border-gray-300'
            }`} 
          />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {isCadastro ? '⚪ Cadastro Original' : 
             isNecessidade ? '🔵 Necessidade/Intervenção' : 
             'Origem desconhecida'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
