import { IntervencoesViewerBase } from '../IntervencoesViewerBase';

interface Props {
  onEditarElemento?: (elemento: any) => void;
}

export default function IntervencoesExecucaoMarcasSHContent({ onEditarElemento }: Props) {
  return (
    <IntervencoesViewerBase
      tipoElemento="marcas_longitudinais"
      tipoOrigem="execucao"
      titulo="🔵 Minhas Intervenções - Marcas Longitudinais SH"
      tabelaIntervencao="ficha_marcas_longitudinais_intervencoes"
      onEditarElemento={onEditarElemento}
      badgeColor="bg-blue-500"
      badgeLabel="EXECUÇÃO"
      usarJoinExplicito={true}
    />
  );
}
