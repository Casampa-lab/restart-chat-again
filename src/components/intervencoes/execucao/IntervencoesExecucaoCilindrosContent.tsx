import IntervencoesViewerBase from "../IntervencoesViewerBase";

export default function IntervencoesExecucaoCilindrosContent(
  props: Partial<React.ComponentProps<typeof IntervencoesViewerBase>>,
) {
  return (
    <IntervencoesViewerBase
      tipoElemento="cilindros"
      tipoOrigem="execucao"
      tabelaIntervencao="ficha_cilindros_intervencoes"
      titulo="Minhas Intervenções – Cilindros (Execução)"
      badgeColor="secondary"
      badgeLabel="EXECUÇÃO"
      {...props}
    />
  );
}
