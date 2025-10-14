import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";

export default function RelatorioMedicao() {
  const navigate = useNavigate();
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [loteId, setLoteId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: lotes } = useQuery({
    queryKey: ["lotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lotes")
        .select("*, empresas(nome)")
        .order("numero");
      if (error) throw error;
      return data;
    },
  });

  const gerarRelatorio = async () => {
    if (!loteId) {
      toast.error("Selecione um lote");
      return;
    }

    setIsGenerating(true);
    try {
      const dataInicio = new Date(ano, mes - 1, 1);
      const dataFim = new Date(ano, mes, 0);

      // Buscar elementos aprovados no período
      const { data: aprovados, error: aprovadosError } = await supabase
        .from("elementos_pendentes_aprovacao")
        .select(`
          *,
          profiles:user_id(nome),
          rodovias:rodovia_id(codigo),
          lotes:lote_id(numero)
        `)
        .eq("lote_id", loteId)
        .eq("status", "aprovado")
        .gte("data_decisao", dataInicio.toISOString())
        .lte("data_decisao", dataFim.toISOString());

      if (aprovadosError) throw aprovadosError;

      // Buscar pendentes
      const { data: pendentes, error: pendentesError } = await supabase
        .from("elementos_pendentes_aprovacao")
        .select(`
          *,
          profiles:user_id(nome),
          rodovias:rodovia_id(codigo),
          lotes:lote_id(numero)
        `)
        .eq("lote_id", loteId)
        .eq("status", "pendente_aprovacao")
        .gte("created_at", dataInicio.toISOString())
        .lte("created_at", dataFim.toISOString());

      if (pendentesError) throw pendentesError;

      // Buscar rejeitados
      const { data: rejeitados, error: rejeitadosError } = await supabase
        .from("elementos_pendentes_aprovacao")
        .select(`
          *,
          profiles:user_id(nome),
          rodovias:rodovia_id(codigo),
          lotes:lote_id(numero)
        `)
        .eq("lote_id", loteId)
        .eq("status", "rejeitado")
        .gte("data_decisao", dataInicio.toISOString())
        .lte("data_decisao", dataFim.toISOString());

      if (rejeitadosError) throw rejeitadosError;

      // Criar workbook
      const workbook = new ExcelJS.Workbook();

      // Aba 1: Medíveis (Aprovados)
      const wsAprovados = workbook.addWorksheet("Medíveis");
      wsAprovados.columns = [
        { header: "Data Aprovação", key: "data", width: 15 },
        { header: "Técnico", key: "tecnico", width: 25 },
        { header: "Rodovia", key: "rodovia", width: 20 },
        { header: "Tipo Elemento", key: "tipo", width: 20 },
        { header: "Justificativa", key: "justificativa", width: 40 },
      ];

      (aprovados || []).forEach((item: any) => {
        wsAprovados.addRow({
          data: new Date(item.data_decisao).toLocaleDateString("pt-BR"),
          tecnico: item.profiles?.nome || "-",
            rodovia: item.rodovias?.codigo || "-",
          tipo: getTipoLabel(item.tipo_elemento),
          justificativa: item.justificativa,
        });
      });

      // Aba 2: Pendentes
      const wsPendentes = workbook.addWorksheet("Pendentes");
      wsPendentes.columns = [
        { header: "Data Registro", key: "data", width: 15 },
        { header: "Técnico", key: "tecnico", width: 25 },
        { header: "Rodovia", key: "rodovia", width: 20 },
        { header: "Tipo Elemento", key: "tipo", width: 20 },
        { header: "Justificativa", key: "justificativa", width: 40 },
      ];

      (pendentes || []).forEach((item: any) => {
        wsPendentes.addRow({
          data: new Date(item.created_at).toLocaleDateString("pt-BR"),
          tecnico: item.profiles?.nome || "-",
            rodovia: item.rodovias?.codigo || "-",
          tipo: getTipoLabel(item.tipo_elemento),
          justificativa: item.justificativa,
        });
      });

      // Aba 3: Não Medíveis (Rejeitados)
      const wsRejeitados = workbook.addWorksheet("Não Medíveis");
      wsRejeitados.columns = [
        { header: "Data Rejeição", key: "data", width: 15 },
        { header: "Técnico", key: "tecnico", width: 25 },
        { header: "Rodovia", key: "rodovia", width: 20 },
        { header: "Tipo Elemento", key: "tipo", width: 20 },
        { header: "Justificativa Técnico", key: "justificativa", width: 30 },
        { header: "Motivo Rejeição", key: "motivo", width: 30 },
      ];

      (rejeitados || []).forEach((item: any) => {
        wsRejeitados.addRow({
          data: new Date(item.data_decisao).toLocaleDateString("pt-BR"),
          tecnico: item.profiles?.nome || "-",
          rodovia: item.rodovias?.codigo || "-",
          tipo: getTipoLabel(item.tipo_elemento),
          justificativa: item.justificativa,
          motivo: item.observacao_coordenador || "-",
        });
      });

      // Estilizar headers
      [wsAprovados, wsPendentes, wsRejeitados].forEach((ws) => {
        ws.getRow(1).font = { bold: true };
        ws.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };
      });

      // Gerar arquivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Relatorio_Medicao_${ano}_${mes.toString().padStart(2, "0")}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success("Relatório gerado com sucesso");
    } catch (error: any) {
      console.error("Erro ao gerar relatório:", error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      marcas_longitudinais: "Marcas Longitudinais",
      placas: "Placas",
      tachas: "Tachas",
      inscricoes: "Inscrições",
      cilindros: "Cilindros",
      porticos: "Pórticos",
      defensas: "Defensas",
    };
    return labels[tipo] || tipo;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <Button
          variant="ghost"
          onClick={() => navigate("/coordenacao-fiscalizacao")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold">Relatório de Medição</h1>
        <p className="text-muted-foreground">
          Gere relatórios de elementos aprovados, pendentes e rejeitados
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Lote</Label>
              <Select value={loteId} onValueChange={setLoteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o lote" />
                </SelectTrigger>
                <SelectContent>
                  {lotes?.map((lote: any) => (
                    <SelectItem key={lote.id} value={lote.id}>
                      Lote {lote.numero} - {lote.empresas?.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Mês</Label>
              <Select value={mes.toString()} onValueChange={(v) => setMes(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(2000, i).toLocaleDateString("pt-BR", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Ano</Label>
              <Select value={ano.toString()} onValueChange={(v) => setAno(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={gerarRelatorio}
            disabled={isGenerating || !loteId}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Gerar Relatório Excel
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sobre o Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            O relatório será gerado com 3 abas:
          </p>
          <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
            <li>
              <strong>Medíveis:</strong> Elementos aprovados no período (podem ser medidos)
            </li>
            <li>
              <strong>Pendentes:</strong> Elementos aguardando aprovação
            </li>
            <li>
              <strong>Não Medíveis:</strong> Elementos rejeitados (criaram NC)
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
