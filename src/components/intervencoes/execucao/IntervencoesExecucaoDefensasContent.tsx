import IntervencoesViewerBase from "@/components/IntervencoesViewerBase";
export default function IntervencoesExecucaoDefensasContent(
  props: Partial<React.ComponentProps<typeof IntervencoesViewerBase>>,
) {
  return (
    <IntervencoesViewerBase
      tipoElemento="defensas"
      tipoOrigem="execucao"
      tabelaIntervencao="defensas_intervencoes"
      titulo="Minhas Intervenções – Defensas (Execução)"
      badgeColor="secondary"
      badgeLabel="EXECUÇÃO"
      {...props}
    />
  );
}
