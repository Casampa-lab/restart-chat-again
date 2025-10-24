import { IntervencoesViewerBase } from '../IntervencoesViewerBase';

interface Props {
  onEditarElemento?: (elemento: any) => void;
}

export default function IntervencoesManutencaoCilindrosContent({ onEditarElemento }: Props) {
  return (
    <IntervencoesViewerBase
      tipoElemento="cilindros"
      tipoOrigem="manutencao_pre_projeto"
      titulo="🟠 Minhas Manutenções IN-3 - Cilindros"
      tabelaIntervencao="ficha_cilindros_intervencoes"
      onEditarElemento={onEditarElemento}
      badgeColor="bg-orange-500"
      badgeLabel="MANUTENÇÃO"
    />
  );
}
