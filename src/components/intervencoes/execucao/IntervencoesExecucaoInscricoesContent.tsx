import IntervencoesViewerBase from "@/components/IntervencoesViewerBase";
export default function IntervencoesExecucaoInscricoesContent(
  props: Partial<React.ComponentProps<typeof IntervencoesViewerBase>>,
) {
  return (
    <IntervencoesViewerBase
      tipoElemento="inscricoes"
      tipoOrigem="execucao"
      tabelaIntervencao="ficha_inscricoes_intervencoes"
      titulo="Minhas Intervenções – Inscrições (Execução)"
      badgeColor="secondary"
      badgeLabel="EXECUÇÃO"
      {...props}
    />
  );
}
