import IntervencoesViewerBase from "../IntervencoesViewerBase";

export default function IntervencoesExecucaoCilindrosContent() {
  return (
    <IntervencoesViewerBase
      tipoElemento="cilindros"
      tipoOrigem="execucao"
      tabelaIntervencao="ficha_cilindros_intervencoes"
      titulo="Minhas Intervenções – Cilindros (Execução)"
      columns={["km_inicial", "km_final", "codigo", "enviada"]}
    />
  );
}
