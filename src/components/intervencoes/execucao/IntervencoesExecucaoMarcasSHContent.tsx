import IntervencoesViewerBase from "../IntervencoesViewerBase";
export default function IntervencoesExecucaoMarcasSHContent(
  props: Partial<React.ComponentProps<typeof IntervencoesViewerBase>>,
) {
  return (
    <IntervencoesViewerBase
      tipoElemento="sh"
      tipoOrigem="execucao"
      tabelaIntervencao="ficha_marcas_longitudinais_intervencoes"
      titulo="Minhas Intervenções – Marcas SH (Execução)"
      badgeColor="secondary"
      badgeLabel="EXECUÇÃO"
      {...props}
    />
  );
}
