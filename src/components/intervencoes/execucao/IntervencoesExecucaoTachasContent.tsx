import { IntervencoesViewerBase } from '../IntervencoesViewerBase';

interface Props {
  onEditarElemento?: (elemento: any) => void;
}

export default function IntervencoesExecucaoTachasContent({ onEditarElemento }: Props) {
  return (
    <IntervencoesViewerBase
      tipoElemento="tachas"
      tipoOrigem="execucao"
      titulo="🔵 Minhas Intervenções - Tachas"
      tabelaIntervencao="ficha_tachas_intervencoes"
      onEditarElemento={onEditarElemento}
      badgeColor="bg-blue-500"
      badgeLabel="EXECUÇÃO"
      usarJoinExplicito={true}
    />
  );
}
