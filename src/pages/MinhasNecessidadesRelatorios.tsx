import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { criarWorkbookComLogos } from "@/lib/excelLogoHelper";
import { useSupervisora } from "@/hooks/useSupervisora";
import logoOperaVia from "@/assets/logo-operavia.jpg";
import { format } from "date-fns";

const TIPOS_RELATORIO = [
  { value: "dados_rodovias", label: "Dados das Rodovias", tabelaCadastro: "dados_rodovias", tabelaIntervencoes: null },
  { value: "marcas_longitudinais", label: "Marcas Longitudinais", tabelaCadastro: "ficha_marcas_longitudinais", tabelaIntervencoes: "ficha_marcas_longitudinais_intervencoes" },
  { value: "tachas", label: "Tachas", tabelaCadastro: "ficha_tachas", tabelaIntervencoes: "ficha_tachas_intervencoes" },
  { value: "marcas_transversais", label: "Zebrados", tabelaCadastro: "ficha_inscricoes", tabelaIntervencoes: "ficha_inscricoes_intervencoes" },
  { value: "cilindros", label: "Cilindros", tabelaCadastro: "ficha_cilindros", tabelaIntervencoes: "ficha_cilindros_intervencoes" },
  { value: "placas", label: "Placas", tabelaCadastro: "ficha_placa", tabelaIntervencoes: "ficha_placa_intervencoes" },
  { value: "porticos", label: "Pórticos", tabelaCadastro: "ficha_porticos", tabelaIntervencoes: "ficha_porticos_intervencoes" },
  { value: "defensas", label: "Defensas", tabelaCadastro: "defensas", tabelaIntervencoes: "defensas_intervencoes" },
];

export default function MinhasNecessidadesRelatorios() {
  const navigate = useNavigate();
  const { data: supervisora } = useSupervisora();
  const [tipoSelecionado, setTipoSelecionado] = useState<string>("dados_rodovias");
  const [gerando, setGerando] = useState(false);
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");

  const gerarRelatorioInicial = async () => {
    try {
      setGerando(true);
      const tipoConfig = TIPOS_RELATORIO.find(t => t.value === tipoSelecionado);
      if (!tipoConfig) return;

      let cadastro: any[] = [];

      // Tratamento especial para Dados das Rodovias
      if (tipoSelecionado === "dados_rodovias") {
        const { data: lotesRodovias, error } = await supabase
          .from("lotes_rodovias")
          .select(`
            *,
            lotes (nome, uf),
            rodovias (nome, codigo)
          `);

        if (error) throw error;

        cadastro = (lotesRodovias || []).map((lr: any) => ({
          estado: lr.lotes?.uf || "",
          lote: lr.lotes?.nome || "",
          rodovia: lr.rodovias?.codigo || lr.rodovias?.nome || "",
          trecho: lr.trecho || "",
          extensao: lr.extensao_km || 0,
        }));
      } else {
        // Buscar dados do CADASTRO normal
        const { data, error } = await supabase
          .from(tipoConfig.tabelaCadastro as any)
          .select("*")
          .order("km_inicial");

        if (error) throw error;
        cadastro = data || [];
      }

      if (!cadastro || cadastro.length === 0) {
        toast.warning("Nenhum dado de cadastro encontrado para este tipo");
        return;
      }

      // Adicionar coluna SERVIÇO vazia (exceto para Dados das Rodovias)
      const dadosComServico = tipoSelecionado === "dados_rodovias" 
        ? cadastro 
        : (cadastro as any[]).map((item: any) => ({
            ...item,
            servico: "", // VAZIO no relatório inicial
          }));

      // Gerar Excel com logos
      const workbook = await criarWorkbookComLogos(dadosComServico, "CADASTRO INICIAL", {
        logoSupervisoraUrl: supervisora?.logo_url,
        logoOrgaoUrl: (supervisora as any)?.logo_orgao_fiscalizador_url,
        nomeEmpresa: supervisora?.nome_empresa,
        contrato: (supervisora as any)?.contrato,
      });

      // NOVA: Buscar intervenções se houver tabela de intervenções E filtro de data
      if (tipoConfig.tabelaIntervencoes && (dataInicio || dataFim)) {
        let query = supabase
          .from(tipoConfig.tabelaIntervencoes as any)
          .select("*")
          .order("data_intervencao", { ascending: false });

        if (dataInicio) {
          query = query.gte("data_intervencao", dataInicio);
        }
        if (dataFim) {
          query = query.lte("data_intervencao", dataFim);
        }

        const { data: intervencoes, error: erroIntervencoes } = await query;

        if (!erroIntervencoes && intervencoes && intervencoes.length > 0) {
          // Criar aba de MANUTENÇÃO EXECUTADA
          const manutencaoSheet = workbook.addWorksheet("MANUTENÇÃO EXECUTADA");
          
          // Headers baseados nas colunas das intervenções
          const headers = Object.keys(intervencoes[0]);
          manutencaoSheet.addRow(headers);

          // Adicionar dados
          intervencoes.forEach((int: any) => {
            const row = headers.map(h => {
              const value = int[h];
              // Formatar datas
              if (h.includes("data") && value) {
                return format(new Date(value), "dd/MM/yyyy");
              }
              // Destacar serviços fora do plano
              if (h === "fora_plano_manutencao") {
                return value ? "⚠️ SIM" : "Não";
              }
              return value;
            });
            manutencaoSheet.addRow(row);
          });

          // Aplicar estilo nas linhas "fora do plano"
          intervencoes.forEach((int: any, index: number) => {
            if (int.fora_plano_manutencao) {
              const rowNum = index + 2; // +2 porque header é row 1 e dados começam em 2
              const row = manutencaoSheet.getRow(rowNum);
              row.eachCell((cell) => {
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFFFF3CD" }, // amarelo claro
                };
                cell.font = {
                  bold: true,
                  color: { argb: "FF856404" }, // laranja escuro
                };
              });
            }
          });
        }
      }

      // Sheet DIC (dicionário)
      const dicData = [
        { Campo: "servico", Descrição: "Tipo de serviço (Inclusão/Substituição/Remoção)" },
        { Campo: "km_inicial", Descrição: "Quilômetro inicial" },
        { Campo: "km_final", Descrição: "Quilômetro final" },
        { Campo: "fora_plano_manutencao", Descrição: "Serviço executado fora do plano de manutenção" },
        { Campo: "justificativa_fora_plano", Descrição: "Justificativa para serviço fora do plano" },
      ];
      const dicSheet = workbook.addWorksheet("DIC");
      dicSheet.addRow(Object.keys(dicData[0]));
      dicData.forEach(row => {
        dicSheet.addRow(Object.values(row));
      });

      // Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
      });
      const nomeArquivo = `1.8.X_CONDICAO_INICIAL_${tipoConfig.label}_${new Date().toISOString().split("T")[0]}.xlsx`;
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = nomeArquivo;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success("Relatório Inicial gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar relatório inicial:", error);
      toast.error("Erro ao gerar relatório: " + error.message);
    } finally {
      setGerando(false);
    }
  };

  const gerarRelatorioPermanente = async () => {
    try {
      setGerando(true);
      const tipoConfig = TIPOS_RELATORIO.find(t => t.value === tipoSelecionado);
      if (!tipoConfig) return;

      // Dados das Rodovias não tem relatório permanente
      if (tipoSelecionado === "dados_rodovias") {
        toast.info("Dados das Rodovias não possui Relatório Permanente. Use o Relatório Inicial.");
        setGerando(false);
        return;
      }

      // Buscar CADASTRO
      const { data: cadastro, error: erroCadastro } = await supabase
        .from(tipoConfig.tabelaCadastro as any)
        .select("*")
        .order("km_inicial");

      if (erroCadastro) throw erroCadastro;

      if (!cadastro || cadastro.length === 0) {
        toast.warning("Nenhum dado de cadastro encontrado para este tipo");
        return;
      }

      // Buscar NECESSIDADES
      const { data: necessidades, error: erroNecessidades } = await supabase
        .from(`necessidades_${tipoSelecionado}` as any)
        .select("*");

      if (erroNecessidades) throw erroNecessidades;

      // Criar mapa de necessidades por cadastro_id
      const necessidadesMap = new Map();
      if (necessidades) {
        necessidades.forEach((nec: any) => {
          if (nec.cadastro_id) {
            necessidadesMap.set(nec.cadastro_id, nec);
          }
        });
      }

      // Mesclar dados: CADASTRO + NECESSIDADES
      const dadosMesclados = (cadastro as any[]).map((item: any) => {
        const necessidade = necessidadesMap.get(item.id);
        return {
          ...item,
          servico: necessidade?.servico || "", // Preenchido se houver necessidade
          observacao_necessidade: necessidade?.observacao || "",
          distancia_match_metros: necessidade?.distancia_match_metros || "",
          arquivo_origem: necessidade?.arquivo_origem || "",
          linha_planilha: necessidade?.linha_planilha || "",
        };
      });

      // Adicionar necessidades SEM match ao cadastro (Inclusões)
      if (necessidades) {
        necessidades.forEach((nec: any) => {
          if (!nec.cadastro_id) {
            dadosMesclados.push({
              ...nec,
              servico: nec.servico,
              observacao_necessidade: nec.observacao || "",
            });
          }
        });
      }

      // Gerar Excel com logos
      const workbook = await criarWorkbookComLogos(dadosMesclados, "Dados", {
        logoSupervisoraUrl: supervisora?.logo_url,
        logoOrgaoUrl: (supervisora as any)?.logo_orgao_fiscalizador_url,
        nomeEmpresa: supervisora?.nome_empresa,
        contrato: (supervisora as any)?.contrato,
      });

      // Sheet DIC
      const dicData = [
        { Campo: "servico", Descrição: "Tipo de serviço (Inclusão/Substituição/Remoção)" },
        { Campo: "km_inicial", Descrição: "Quilômetro inicial" },
        { Campo: "km_final", Descrição: "Quilômetro final" },
        { Campo: "observacao_necessidade", Descrição: "Observação da necessidade identificada" },
      ];
      const dicSheet = workbook.addWorksheet("DIC");
      dicSheet.addRow(Object.keys(dicData[0]));
      dicData.forEach(row => {
        dicSheet.addRow(Object.values(row));
      });

      // Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
      });
      const nomeArquivo = `RELATORIO_PERMANENTE_${tipoConfig.label}_${new Date().toISOString().split("T")[0]}.xlsx`;
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = nomeArquivo;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success("Relatório Permanente gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar relatório permanente:", error);
      toast.error("Erro ao gerar relatório: " + error.message);
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logoOperaVia} alt="Logo" className="h-12 object-contain" />
              <div>
                <h1 className="text-2xl font-bold">Relatórios de Programa de Sinalização e Segurança Viária</h1>
                <p className="text-sm text-muted-foreground">
                  Gere relatórios inicial e permanente do cadastro
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/minhas-necessidades")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="inicial" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px] mx-auto">
            <TabsTrigger value="inicial">Relatório Inicial</TabsTrigger>
            <TabsTrigger value="permanente">Relatório Permanente</TabsTrigger>
          </TabsList>

          <TabsContent value="inicial" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Relatório Inicial
                </CardTitle>
                <CardDescription>
                  Exporta o estado atual do CADASTRO com coluna SERVIÇO vazia para preenchimento posterior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Elemento</label>
                  <Select value={tipoSelecionado} onValueChange={setTipoSelecionado}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_RELATORIO.map(tipo => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro de datas para incluir aba de manutenção executada */}
                {tipoSelecionado !== "dados_rodovias" && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <h4 className="text-sm font-medium">Período de Manutenção (opcional)</h4>
                    <p className="text-xs text-muted-foreground">
                      Informe o período para incluir aba "MANUTENÇÃO EXECUTADA" no relatório
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Data Início</label>
                        <Input
                          type="date"
                          value={dataInicio}
                          onChange={(e) => setDataInicio(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Data Fim</label>
                        <Input
                          type="date"
                          value={dataFim}
                          onChange={(e) => setDataFim(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h4 className="font-medium text-sm">O que será exportado:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Aba "CADASTRO INICIAL": Todos os registros do cadastro atual</li>
                    {dataInicio || dataFim ? (
                      <li>Aba "MANUTENÇÃO EXECUTADA": Serviços realizados no período (com destaque para serviços fora do plano)</li>
                    ) : null}
                    <li>Aba "DIC": Dicionário de campos</li>
                  </ul>
                </div>

                <Button
                  onClick={gerarRelatorioInicial}
                  disabled={gerando}
                  className="w-full"
                  size="lg"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {gerando ? "Gerando..." : "Gerar Relatório Inicial"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permanente" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Relatório Permanente
                </CardTitle>
                <CardDescription>
                  Exporta o CADASTRO mesclado com NECESSIDADES identificadas (coluna serviço preenchida onde há necessidade)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Elemento</label>
                  <Select value={tipoSelecionado} onValueChange={setTipoSelecionado}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_RELATORIO.map(tipo => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h4 className="font-medium text-sm">O que será exportado:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Todos os registros do cadastro</li>
                    <li>Coluna "serviço" preenchida onde há necessidade</li>
                    <li>Inclusões (necessidades sem match) adicionadas ao final</li>
                    <li>Observações das necessidades incluídas</li>
                    <li>Sheet DIC com dicionário de campos</li>
                  </ul>
                </div>

                <Button
                  onClick={gerarRelatorioPermanente}
                  disabled={gerando}
                  className="w-full"
                  size="lg"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {gerando ? "Gerando..." : "Gerar Planilha para o Relatório Permanente"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
