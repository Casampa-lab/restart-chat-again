import { IntervencoesViewerBase } from '../IntervencoesViewerBase';

interface Props {
  onEditarElemento?: (elemento: any) => void;
}

export default function IntervencoesManutencaoDefensasContent({ onEditarElemento }: Props) {
  return (
    <IntervencoesViewerBase
      tipoElemento="defensas"
      tipoOrigem="manutencao_pre_projeto"
      titulo="🟠 Minhas Manutenções IN-3 - Defensas"
      tabelaIntervencao="defensas_intervencoes"
      onEditarElemento={onEditarElemento}
      badgeColor="bg-orange-500"
      badgeLabel="MANUTENÇÃO"
      usarJoinExplicito={true}
    />
  );
}
