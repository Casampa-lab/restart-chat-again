import IntervencoesViewerBase from "../IntervencoesViewerBase";

export default function IntervencoesExecucaoCilindrosContent() {
  const tipoElemento = "cilindros" as const;
  const tipoOrigem = "execucao" as const;

  return (
    <IntervencoesViewerBase
      tipoElemento={tipoElemento}
      tipoOrigem={tipoOrigem}
      tabelaIntervencao="ficha_cilindros_intervencoes"
      titulo="Minhas Intervenções – Cilindros (Execução)"
      badgeColor="secondary"
      badgeLabel="EXECUÇÃO"
      // Cilindros são lineares → km_final visível
      columns={["km_inicial", "km_final", "codigo", "enviada"]}
      // Força o “olhinho” a abrir o form direto, sem voltar para a seleção
      getEditUrl={({ row }) =>
        `/registrar-intervencao?edit=${encodeURIComponent(
          row?.id ?? ""
        )}&tipo=${tipoElemento}&origem=${tipoOrigem}`
      }
      // Botão “+ Novo”
      getNewUrl={() =>
        `/registrar-intervencao?new=1&tipo=${tipoElemento}&origem=${tipoOrigem}`
      }
    />
  );
}
