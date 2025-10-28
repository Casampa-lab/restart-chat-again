import IntervencoesViewerBase from "../IntervencoesViewerBase";
export default function IntervencoesManutencaoInscricoesContent(
  props: Partial<React.ComponentProps<typeof IntervencoesViewerBase>>,
) {
  return (
    <IntervencoesViewerBase
      tipoElemento="inscricoes"
      tipoOrigem="manutencao_pre_projeto"
      tabelaIntervencao="ficha_inscricoes_intervencoes"
      titulo="Minhas Manutenções IN-3 – Inscrições"
      badgeColor="warning"
      badgeLabel="MANUTENÇÃO"
      {...props}
    />
  );
}
