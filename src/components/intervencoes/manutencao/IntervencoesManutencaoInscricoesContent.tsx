import { IntervencoesViewerBase } from '../IntervencoesViewerBase';

interface Props {
  onEditarElemento?: (elemento: any) => void;
}

export default function IntervencoesManutencaoInscricoesContent({ onEditarElemento }: Props) {
  return (
    <IntervencoesViewerBase
      tipoElemento="inscricoes"
      tipoOrigem="manutencao_pre_projeto"
      titulo="🟠 Minhas Manutenções IN-3 - Inscrições"
      tabelaIntervencao="ficha_inscricoes_intervencoes"
      onEditarElemento={onEditarElemento}
      badgeColor="bg-orange-500"
      badgeLabel="MANUTENÇÃO"
      usarJoinExplicito={true}
    />
  );
}
