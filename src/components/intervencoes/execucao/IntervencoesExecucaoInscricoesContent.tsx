import { IntervencoesViewerBase } from '../IntervencoesViewerBase';

interface Props {
  onEditarElemento?: (elemento: any) => void;
}

export default function IntervencoesExecucaoInscricoesContent({ onEditarElemento }: Props) {
  return (
    <IntervencoesViewerBase
      tipoElemento="inscricoes"
      tipoOrigem="execucao"
      titulo="🔵 Minhas Intervenções - Inscrições"
      tabelaIntervencao="ficha_inscricoes_intervencoes"
      onEditarElemento={onEditarElemento}
      badgeColor="bg-blue-500"
      badgeLabel="EXECUÇÃO"
      usarJoinExplicito={false}
    />
  );
}
