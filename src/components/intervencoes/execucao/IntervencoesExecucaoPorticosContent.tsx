import IntervencoesViewerBase from "@/components/IntervencoesViewerBase";
export default function IntervencoesExecucaoPorticosContent(
  props: Partial<React.ComponentProps<typeof IntervencoesViewerBase>>,
) {
  return (
    <IntervencoesViewerBase
      tipoElemento="porticos"
      tipoOrigem="execucao"
      tabelaIntervencao="ficha_porticos_intervencoes"
      titulo="Minhas Intervenções – Pórticos (Execução)"
      badgeColor="secondary"
      badgeLabel="EXECUÇÃO"
      {...props}
    />
  );
}
