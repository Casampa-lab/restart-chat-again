import { IntervencoesViewerBase } from './intervencoes/IntervencoesViewerBase';

interface Props {
  onEditarElemento?: (elemento: any) => void;
}

export default function IntervencoesSVContent({ onEditarElemento }: Props) {
  return (
    <IntervencoesViewerBase
      tipoElemento="placas"
      tipoOrigem="execucao"
      titulo="🔵 Minhas Intervenções - Placas SV"
      tabelaIntervencao="ficha_placa_intervencoes"
      onEditarElemento={onEditarElemento}
      badgeColor="bg-blue-500"
      badgeLabel="EXECUÇÃO"
      usarJoinExplicito={true}
    />
  );
}
