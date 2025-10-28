import IntervencoesViewerBase from "../IntervencoesViewerBase";

export default function IntervencoesManutencaoCilindrosContent() {
  return (
    <IntervencoesViewerBase
      tipoElemento="cilindros"
      tipoOrigem="manutencao_pre_projeto"
      tabelaIntervencao="ficha_cilindros_intervencoes"
      titulo="Minhas Manutenções – Cilindros (IN-3)"
      columns={["km_inicial", "km_final", "codigo", "enviada"]}
    />
  );
}
