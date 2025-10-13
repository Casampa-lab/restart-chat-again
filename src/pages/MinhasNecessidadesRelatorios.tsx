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

  const exportarAnalise = async (tipo: "placas" | "porticos") => {
    setGerando(true);
    try {
      const tabela = tipo === "placas" ? "ficha_placa" : "ficha_porticos";
      const orderBy = tipo === "placas" ? "km" : "km";
      
      // Buscar todos os dados
      const { data, error } = await supabase
        .from(tabela)
        .select("*")
        .order(orderBy);

      if (error) throw error;

      // Buscar lotes e rodovias para nomes legíveis
      const { data: lotes } = await supabase.from("lotes").select("id, numero");
      const { data: rodovias } = await supabase.from("rodovias").select("id, codigo, nome");
      
      const lotesMap = new Map((lotes || []).map(l => [l.id, l.numero]));
      const rodoviasMap = new Map((rodovias || []).map(r => [r.id, { codigo: r.codigo, nome: r.nome }]));

      // Analisar cada registro
      const dadosAnalise = (data || []).map((item: any) => {
        const alertas: string[] = [];
        
        if (tipo === "placas") {
          // Análise específica para placas
          if (item.modelo && item.codigo && item.modelo.trim() === item.codigo.trim()) {
            alertas.push("MODELO=CODIGO");
          }
          if (item.descricao && item.codigo && item.descricao.trim() === item.codigo.trim()) {
            alertas.push("DESCRICAO=CODIGO");
          }
          if (item.descricao && item.tipo && item.descricao.trim() === item.tipo.trim()) {
            alertas.push("DESCRICAO=TIPO");
          }
          
          const fotosPreenchidas = [
            item.foto_url,
            item.foto_frontal_url,
            item.foto_lateral_url,
            item.foto_posterior_url,
            item.foto_base_url,
            item.foto_identificacao_url
          ].filter(f => f && f.trim() !== "").length;
          
          if (fotosPreenchidas === 0) {
            alertas.push("SEM_FOTOS");
          } else if (fotosPreenchidas > 2) {
            alertas.push("MULTIPLAS_FOTOS");
          }
          
          if (!item.modelo || item.modelo.trim() === "") {
            alertas.push("MODELO_VAZIO");
          }
        }

        const rodovia = rodoviasMap.get(item.rodovia_id);
        
        return {
          lote: lotesMap.get(item.lote_id) || "",
          rodovia: rodovia?.codigo || rodovia?.nome || "",
          ...item,
          ALERTA_MODELO: (tipo === "placas" && item.modelo === item.codigo) ? "SIM" : "",
          ALERTA_DESCRICAO: (tipo === "placas" && (item.descricao === item.codigo || item.descricao === item.tipo)) ? "SIM" : "",
          ALERTA_FOTO: (tipo === "placas") ? (
            !item.foto_url && !item.foto_frontal_url ? "VAZIO" : 
            ([item.foto_url, item.foto_frontal_url, item.foto_lateral_url, item.foto_posterior_url, item.foto_base_url].filter(f => f).length > 2) ? "MULTIPLAS" : ""
          ) : "",
          STATUS_REVISAO: alertas.length > 0 ? alertas.join(" | ") : "OK",
        };
      });

      // Criar workbook
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Análise");

      // Adicionar dados
      if (dadosAnalise.length > 0) {
        const colunas = Object.keys(dadosAnalise[0]);
        sheet.columns = colunas.map(col => ({ header: col, key: col, width: 20 }));
        dadosAnalise.forEach(row => sheet.addRow(row));

        // Formatar header
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        };

        // Destacar linhas com alertas
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            const statusCell = row.getCell('STATUS_REVISAO');
            if (statusCell.value && statusCell.value !== "OK") {
              row.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFEB9C' }
              };
            }
          }
        });
      }

      // Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analise_${tipo}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success(`Análise de ${tipo} exportada com sucesso!`);
    } catch (error) {
      console.error("Erro ao exportar análise:", error);
      toast.error("Erro ao exportar análise");
    } finally {
      setGerando(false);
    }
  };

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
            lotes (numero),
            rodovias (nome, codigo)
          `);

        if (error) throw error;

        cadastro = (lotesRodovias || []).map((lr: any) => ({
          lote: lr.lotes?.numero || "",
          rodovia: lr.rodovias?.codigo || lr.rodovias?.nome || "",
        }));
      } else {
        // Buscar dados do CADASTRO normal
        const orderByColumn = (tipoSelecionado === "placas" || tipoSelecionado === "porticos") ? "km" : "km_inicial";
        const { data, error } = await supabase
          .from(tipoConfig.tabelaCadastro as any)
          .select("*")
          .order(orderByColumn);

        if (error) throw error;
        
        // Buscar lotes e rodovias separadamente para mapear os nomes
        const { data: lotes } = await supabase.from("lotes").select("id, numero");
        const { data: rodovias } = await supabase.from("rodovias").select("id, codigo, nome");
        
        // Criar mapa de lotes e rodovias
        const lotesMap = new Map((lotes || []).map(l => [l.id, l.numero]));
        const rodoviasMap = new Map((rodovias || []).map(r => [r.id, { codigo: r.codigo, nome: r.nome }]));
        
        // Transformar dados: remover IDs técnicos e adicionar nomes legíveis
        cadastro = (data || []).map((item: any) => {
          const { id, user_id, lote_id, rodovia_id, created_at, updated_at, enviado_coordenador, ...resto } = item;
          const rodovia = rodoviasMap.get(rodovia_id);
          return {
            lote: lotesMap.get(lote_id) || "",
            rodovia: rodovia?.codigo || rodovia?.nome || "",
            ...resto,
          };
        });
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

        const { data: intervencoesRaw, error: erroIntervencoes } = await query;

        if (!erroIntervencoes && intervencoesRaw && intervencoesRaw.length > 0) {
          // Transformar intervenções: remover IDs técnicos
          const intervencoes = intervencoesRaw.map((item: any) => {
            const { id, created_at, ...resto } = item;
            return resto;
          });
          
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
      const orderByColumn = (tipoSelecionado === "placas" || tipoSelecionado === "porticos") ? "km" : "km_inicial";
      const { data: cadastroRaw, error: erroCadastro } = await supabase
        .from(tipoConfig.tabelaCadastro as any)
        .select("*")
        .order(orderByColumn);

      if (erroCadastro) throw erroCadastro;
      
      // Buscar lotes e rodovias separadamente para mapear os nomes
      const { data: lotes } = await supabase.from("lotes").select("id, numero");
      const { data: rodovias } = await supabase.from("rodovias").select("id, codigo, nome");
      
      // Criar mapa de lotes e rodovias
      const lotesMap = new Map((lotes || []).map(l => [l.id, l.numero]));
      const rodoviasMap = new Map((rodovias || []).map(r => [r.id, { codigo: r.codigo, nome: r.nome }]));
      
      // Transformar cadastro: remover IDs técnicos e adicionar nomes legíveis
      const cadastro = (cadastroRaw || []).map((item: any) => {
        const { id, user_id, lote_id, rodovia_id, created_at, updated_at, enviado_coordenador, ...resto } = item;
        const rodovia = rodoviasMap.get(rodovia_id);
        return {
          lote: lotesMap.get(lote_id) || "",
          rodovia: rodovia?.codigo || rodovia?.nome || "",
          ...resto,
        };
      });

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
          <TabsList className="grid w-full grid-cols-3 max-w-[600px] mx-auto">
            <TabsTrigger value="inicial">Relatório Inicial</TabsTrigger>
            <TabsTrigger value="permanente">Relatório Permanente</TabsTrigger>
            <TabsTrigger value="analise">Análise de Dados</TabsTrigger>
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

          <TabsContent value="analise" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Exportar Dados para Análise Manual
                </CardTitle>
                <CardDescription>
                  Exporte os dados brutos com análise automática de inconsistências para revisão manual
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button 
                    onClick={() => exportarAnalise("placas")} 
                    disabled={gerando}
                    className="w-full"
                  >
                    {gerando ? "Exportando..." : "Exportar Análise de Placas"}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Exporta todos os dados de placas com colunas de análise destacando possíveis duplicações e campos vazios
                  </p>
                </div>

                <div className="space-y-2">
                  <Button 
                    onClick={() => exportarAnalise("porticos")} 
                    disabled={gerando}
                    className="w-full"
                  >
                    {gerando ? "Exportando..." : "Exportar Análise de Pórticos"}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Exporta todos os dados de pórticos com colunas de análise destacando possíveis inconsistências
                  </p>
                </div>

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">O que será exportado:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Todos os campos atuais do cadastro</li>
                    <li>Coluna "ALERTA_MODELO" - identifica quando modelo = codigo</li>
                    <li>Coluna "ALERTA_DESCRICAO" - identifica quando descricao = codigo ou tipo</li>
                    <li>Coluna "ALERTA_FOTO" - identifica campos de foto vazios ou duplicados</li>
                    <li>Coluna "STATUS_REVISAO" - resumo das inconsistências encontradas</li>
                    <li>Linhas com problemas destacadas em amarelo</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
