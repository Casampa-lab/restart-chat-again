import { IntervencoesViewerBase } from '../IntervencoesViewerBase';

interface Props {
  onEditarElemento?: (elemento: any) => void;
}

export default function IntervencoesManutencaoTachasContent({ onEditarElemento }: Props) {
  return (
    <IntervencoesViewerBase
      tipoElemento="tachas"
      tipoOrigem="manutencao_pre_projeto"
      titulo="🟠 Minhas Manutenções IN-3 - Tachas"
      tabelaIntervencao="ficha_tachas_intervencoes"
      onEditarElemento={onEditarElemento}
      badgeColor="bg-orange-500"
      badgeLabel="MANUTENÇÃO"
    />
  );
}
