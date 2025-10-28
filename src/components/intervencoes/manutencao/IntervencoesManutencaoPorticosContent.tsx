import IntervencoesViewerBase from "../IntervencoesViewerBase";

export default function IntervencoesManutencaoPorticosContent(
  props: Partial<React.ComponentProps<typeof IntervencoesViewerBase>>,
) {
  return (
    <IntervencoesViewerBase
      tipoElemento="porticos"
      tipoOrigem="manutencao_pre_projeto"
      tabelaIntervencao="ficha_porticos_intervencoes"
      titulo="Minhas Manutenções IN-3 – Pórticos"
      badgeColor="warning"
      badgeLabel="MANUTENÇÃO"
      {...props}
    />
  );
}
