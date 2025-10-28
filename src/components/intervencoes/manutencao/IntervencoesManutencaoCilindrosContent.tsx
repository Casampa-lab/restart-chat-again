import { IntervencoesViewerBase } from "../IntervencoesViewerBase";

export default function IntervencoesManutencaoCilindrosContent(
  props: Partial<React.ComponentProps<typeof IntervencoesViewerBase>>,
) {
  return (
    <IntervencoesViewerBase
      tipoElemento="cilindros"
      tipoOrigem="manutencao_pre_projeto"
      tabelaIntervencao="ficha_cilindros_intervencoes"
      titulo="Minhas Manutenções IN-3 – Cilindros"
      badgeColor="warning"
      badgeLabel="MANUTENÇÃO"
      {...props}
    />
  );
}
