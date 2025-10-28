import { IntervencoesViewerBase } from "../IntervencoesViewerBase";

export default function IntervencoesManutencaoTachasContent(
  props: Partial<React.ComponentProps<typeof IntervencoesViewerBase>>,
) {
  return (
    <IntervencoesViewerBase
      tipoElemento="tachas"
      tipoOrigem="manutencao_pre_projeto"
      tabelaIntervencao="ficha_tachas_intervencoes"
      titulo="Minhas Manutenções IN-3 – Tachas"
      badgeColor="warning"
      badgeLabel="MANUTENÇÃO"
      {...props}
    />
  );
}
