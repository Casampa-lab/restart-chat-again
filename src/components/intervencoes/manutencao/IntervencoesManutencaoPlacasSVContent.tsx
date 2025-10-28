import IntervencoesViewerBase from "../IntervencoesViewerBase";

export default function IntervencoesManutencaoPlacasSVContent(
  props: Partial<React.ComponentProps<typeof IntervencoesViewerBase>>,
) {
  return (
    <IntervencoesViewerBase
      tipoElemento="placas"
      tipoOrigem="manutencao_pre_projeto"
      tabelaIntervencao="ficha_placa_intervencoes"
      titulo="Minhas Manutenções IN-3 – Placas"
      badgeColor="warning"
      badgeLabel="MANUTENÇÃO"
      {...props}
    />
  );
}
