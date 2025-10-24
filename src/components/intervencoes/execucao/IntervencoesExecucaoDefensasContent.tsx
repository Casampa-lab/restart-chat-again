import { IntervencoesViewerBase } from '../IntervencoesViewerBase';

interface Props {
  onEditarElemento?: (elemento: any) => void;
}

export default function IntervencoesExecucaoDefensasContent({ onEditarElemento }: Props) {
  return (
    <IntervencoesViewerBase
      tipoElemento="defensas"
      tipoOrigem="execucao"
      titulo="🔵 Minhas Intervenções - Defensas"
      tabelaIntervencao="defensas_intervencoes"
      onEditarElemento={onEditarElemento}
      badgeColor="bg-blue-500"
      badgeLabel="EXECUÇÃO"
    />
  );
}
