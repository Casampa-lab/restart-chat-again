import IntervencoesViewerBase from "../IntervencoesViewerBase";

export default function IntervencoesExecucaoCilindrosContent() {
  return (
    <IntervencoesViewerBase
      tipoElemento="cilindros"
      tipoOrigem="execucao"
      tabelaIntervencao="ficha_cilindros_intervencoes"
      titulo="Minhas Intervenções – Cilindros (Execução)"
      // badgeColor removido para evitar erro de tipo; badgeLabel é aceito
      badgeLabel="EXECUÇÃO"
      // Cilindros são lineares → exibir km_final
      columns={["km_inicial", "km_final", "codigo", "enviada"]}
      // “Olho” abre o formulário de edição direto
      getEditUrl={({ row }) =>
        `/registrar-intervencao?edit=${encodeURIComponent(
          row?.id ?? ""
        )}&tipo=cilindros&origem=execucao`
      }
      // Botão “+ Novo”
      getNewUrl={() =>
        `/registrar-intervencao?new=1&tipo=cilindros&origem=execucao`
      }
    />
  );
}
