import { IntervencoesViewerBase } from '../IntervencoesViewerBase';

interface Props {
  onEditarElemento?: (elemento: any) => void;
}

export default function IntervencoesManutencaoMarcasSHContent({ onEditarElemento }: Props) {
  return (
    <IntervencoesViewerBase
      tipoElemento="marcas_longitudinais"
      tipoOrigem="manutencao_pre_projeto"
      titulo="🟠 Minhas Manutenções IN-3 - Marcas Longitudinais SH"
      tabelaIntervencao="ficha_marcas_longitudinais_intervencoes"
      onEditarElemento={onEditarElemento}
      badgeColor="bg-orange-500"
      badgeLabel="MANUTENÇÃO"
      usarJoinExplicito={false}
    />
  );
}
