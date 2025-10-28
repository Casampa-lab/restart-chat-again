import { IntervencoesViewerBase } from "../IntervencoesViewerBase";

export default function IntervencoesManutencaoDefensasContent(
  props: Partial<React.ComponentProps<typeof IntervencoesViewerBase>>,
) {
  return (
    <IntervencoesViewerBase
      tipoElemento="defensas"
      tipoOrigem="manutencao_pre_projeto"
      tabelaIntervencao="defensas_intervencoes"
      titulo="Minhas Manutenções IN-3 – Defensas"
      badgeColor="warning"
      badgeLabel="MANUTENÇÃO"
      {...props}
    />
  );
}
