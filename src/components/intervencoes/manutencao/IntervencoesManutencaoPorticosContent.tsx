import { IntervencoesViewerBase } from '../IntervencoesViewerBase';

interface Props {
  onEditarElemento?: (elemento: any) => void;
}

export default function IntervencoesManutencaoPorticosContent({ onEditarElemento }: Props) {
  return (
    <IntervencoesViewerBase
      tipoElemento="porticos"
      tipoOrigem="manutencao_pre_projeto"
      titulo="🟠 Minhas Manutenções IN-3 - Pórticos"
      tabelaIntervencao="ficha_porticos_intervencoes"
      onEditarElemento={onEditarElemento}
      badgeColor="bg-orange-500"
      badgeLabel="MANUTENÇÃO"
      usarJoinExplicito={false}
    />
  );
}
