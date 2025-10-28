import IntervencoesViewerBase from "../IntervencoesViewerBase";
export default function IntervencoesManutencaoMarcasSHContent(
  props: Partial<React.ComponentProps<typeof IntervencoesViewerBase>>,
) {
  return (
    <IntervencoesViewerBase
      tipoElemento="sh"
      tipoOrigem="manutencao_pre_projeto"
      tabelaIntervencao="ficha_marcas_longitudinais_intervencoes"
      titulo="Minhas Manutenções IN-3 – Marcas SH"
      badgeColor="warning"
      badgeLabel="MANUTENÇÃO"
      {...props}
    />
  );
}
