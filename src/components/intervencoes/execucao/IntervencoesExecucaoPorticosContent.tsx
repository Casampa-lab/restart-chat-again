import { IntervencoesViewerBase } from '../IntervencoesViewerBase';

interface Props {
  onEditarElemento?: (elemento: any) => void;
}

export default function IntervencoesExecucaoPorticosContent({ onEditarElemento }: Props) {
  return (
    <IntervencoesViewerBase
      tipoElemento="porticos"
      tipoOrigem="execucao"
      titulo="🔵 Minhas Intervenções - Pórticos"
      tabelaIntervencao="ficha_porticos_intervencoes"
      onEditarElemento={onEditarElemento}
      badgeColor="bg-blue-500"
      badgeLabel="EXECUÇÃO"
      usarJoinExplicito={true}
    />
  );
}
