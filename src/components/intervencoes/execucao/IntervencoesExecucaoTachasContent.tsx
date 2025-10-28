import { IntervencoesViewerBase } from "../IntervencoesViewerBase";
export default function IntervencoesExecucaoTachasContent(
  props: Partial<React.ComponentProps<typeof IntervencoesViewerBase>>,
) {
  return (
    <IntervencoesViewerBase
      tipoElemento="tachas"
      tipoOrigem="execucao"
      tabelaIntervencao="ficha_tachas_intervencoes"
      titulo="Minhas Intervenções – Tachas (Execução)"
      badgeColor="secondary"
      badgeLabel="EXECUÇÃO"
      {...props}
    />
  );
}
