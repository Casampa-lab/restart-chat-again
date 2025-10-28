import { IntervencoesViewerBase } from "../IntervencoesViewerBase";

export default function IntervencoesExecucaoPlacasSVContent(
  props: Partial<React.ComponentProps<typeof IntervencoesViewerBase>>,
) {
  return (
    <IntervencoesViewerBase
      tipoElemento="placas"
      tipoOrigem="execucao"
      tabelaIntervencao="ficha_placa_intervencoes"
      titulo="Minhas Intervenções – Placas (Execução)"
      badgeColor="secondary"
      badgeLabel="EXECUÇÃO"
      {...props}
    />
  );
}
