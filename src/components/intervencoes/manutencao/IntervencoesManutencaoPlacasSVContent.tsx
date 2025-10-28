import { IntervencoesViewerBase } from '../IntervencoesViewerBase';

interface Props {
  onEditarElemento?: (elemento: any) => void;
}

export default function IntervencoesManutencaoPlacasSVContent({ onEditarElemento }: Props) {
  return (
    <IntervencoesViewerBase
      tipoElemento="placas"
      tipoOrigem="manutencao_pre_projeto"
      titulo="🟠 Minhas Manutenções IN-3 - Placas SV"
      tabelaIntervencao="ficha_placa_intervencoes"
      onEditarElemento={onEditarElemento}
      badgeColor="bg-orange-500"
      badgeLabel="MANUTENÇÃO"
      usarJoinExplicito={true}
    />
  );
}
