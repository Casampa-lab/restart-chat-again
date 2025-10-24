import { IntervencoesViewerBase } from '../IntervencoesViewerBase';

interface Props {
  onEditarElemento?: (elemento: any) => void;
}

export default function IntervencoesExecucaoCilindrosContent({ onEditarElemento }: Props) {
  return (
    <IntervencoesViewerBase
      tipoElemento="cilindros"
      tipoOrigem="execucao"
      titulo="🔵 Minhas Intervenções - Cilindros"
      tabelaIntervencao="ficha_cilindros_intervencoes"
      onEditarElemento={onEditarElemento}
      badgeColor="bg-blue-500"
      badgeLabel="EXECUÇÃO"
    />
  );
}
