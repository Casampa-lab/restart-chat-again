import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type TipoIntervencao = 
  | "intervencoes_sh"
  | "intervencoes_inscricoes"
  | "intervencoes_sv"
  | "intervencoes_tacha"
  | "ficha_marcas_longitudinais_intervencoes"
  | "ficha_cilindros_intervencoes"
  | "ficha_porticos_intervencoes"
  | "defensas_intervencoes"
  | "ficha_inscricoes_intervencoes"
  | "ficha_tachas_intervencoes"
  | "ficha_placa_intervencoes";

interface IntervencaoRow {
  id: string;
  data_intervencao: string;
  tipo_tabela: TipoIntervencao;
  tipo_servico: string;
  lote_id: string;
  rodovia_id: string;
  km_inicial?: number;
  km?: number;
  fora_plano_manutencao: boolean;
  justificativa_fora_plano: string | null;
  descricao: string;
}

export default function RevisaoIntervencoes() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [intervencoes, setIntervencoes] = useState<IntervencaoRow[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [rodovias, setRodovias] = useState<any[]>([]);
  const [loteFiltro, setLoteFiltro] = useState<string>("todos");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");

  const TIPOS_INTERVENCAO = [
    { value: "intervencoes_sh", label: "SH - Sinalização Horizontal" },
    { value: "intervencoes_inscricoes", label: "Inscrições" },
    { value: "intervencoes_sv", label: "SV - Sinalização Vertical" },
    { value: "intervencoes_tacha", label: "Tachas" },
    { value: "ficha_marcas_longitudinais_intervencoes", label: "Marcas Longitudinais" },
    { value: "ficha_cilindros_intervencoes", label: "Cilindros" },
    { value: "ficha_porticos_intervencoes", label: "Pórticos" },
    { value: "defensas_intervencoes", label: "Defensas" },
    { value: "ficha_inscricoes_intervencoes", label: "Inscrições (Ficha)" },
    { value: "ficha_tachas_intervencoes", label: "Tachas (Ficha)" },
    { value: "ficha_placa_intervencoes", label: "Placas" },
  ];

  useEffect(() => {
    if (session) {
      carregarDados();
    }
  }, [session]);

  const carregarDados = async () => {
    try {
      setLoading(true);

      // Carregar lotes e rodovias
      const { data: lotesData } = await supabase.from("lotes").select("*");
      const { data: rodoviasData } = await supabase.from("rodovias").select("*");
      
      setLotes(lotesData || []);
      setRodovias(rodoviasData || []);

      // Carregar todas as intervenções de todas as tabelas
      const todasIntervencoes: IntervencaoRow[] = [];

      for (const tipo of TIPOS_INTERVENCAO) {
        const { data, error } = await supabase
          .from(tipo.value as any)
          .select("*")
          .order("data_intervencao", { ascending: false });

        if (error) {
          console.error(`Erro ao carregar ${tipo.label}:`, error);
          continue;
        }

        if (data) {
          const intervencoesTipo = data.map((item: any) => {
            let descricao = "";
            let km = item.km_inicial || item.km || 0;

            // Construir descrição baseado no tipo
            if (tipo.value === "intervencoes_sh") {
              descricao = `${item.tipo_demarcacao || ""} - ${item.cor || ""} - ${item.extensao_metros || 0}m`;
            } else if (tipo.value === "intervencoes_tacha") {
              descricao = `${item.tipo_tacha || ""} - ${item.quantidade || 0} unid.`;
            } else if (tipo.value === "ficha_placa_intervencoes") {
              descricao = `Placa - ${item.motivo || ""}`;
            } else {
              descricao = item.motivo || item.tipo_intervencao || "Intervenção";
            }

            return {
              id: item.id,
              data_intervencao: item.data_intervencao,
              tipo_tabela: tipo.value as TipoIntervencao,
              tipo_servico: tipo.label,
              lote_id: item.lote_id || "",
              rodovia_id: item.rodovia_id || "",
              km_inicial: km,
              km: km,
              fora_plano_manutencao: item.fora_plano_manutencao || false,
              justificativa_fora_plano: item.justificativa_fora_plano || null,
              descricao,
            };
          });

          todasIntervencoes.push(...intervencoesTipo);
        }
      }

      setIntervencoes(todasIntervencoes);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as intervenções.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleForaPlano = (index: number) => {
    const updated = [...intervencoes];
    updated[index].fora_plano_manutencao = !updated[index].fora_plano_manutencao;
    if (!updated[index].fora_plano_manutencao) {
      updated[index].justificativa_fora_plano = null;
    }
    setIntervencoes(updated);
  };

  const handleJustificativaChange = (index: number, value: string) => {
    const updated = [...intervencoes];
    updated[index].justificativa_fora_plano = value;
    setIntervencoes(updated);
  };

  const handleSalvar = async () => {
    try {
      setSaving(true);

      // Validar: se marcado como fora do plano, deve ter justificativa
      const semJustificativa = intervencoes.filter(
        (i) => i.fora_plano_manutencao && (!i.justificativa_fora_plano || i.justificativa_fora_plano.trim() === "")
      );

      if (semJustificativa.length > 0) {
        toast({
          title: "Justificativas obrigatórias",
          description: `${semJustificativa.length} intervenção(ões) marcada(s) como "Fora do Plano" sem justificativa.`,
          variant: "destructive",
        });
        return;
      }

      // Agrupar por tipo de tabela
      const porTabela: Record<string, IntervencaoRow[]> = {};
      intervencoes.forEach((int) => {
        if (!porTabela[int.tipo_tabela]) {
          porTabela[int.tipo_tabela] = [];
        }
        porTabela[int.tipo_tabela].push(int);
      });

      // Atualizar cada tabela
      for (const [tabela, items] of Object.entries(porTabela)) {
        for (const item of items) {
          const { error } = await supabase
            .from(tabela as any)
            .update({
              fora_plano_manutencao: item.fora_plano_manutencao,
              justificativa_fora_plano: item.justificativa_fora_plano,
            })
            .eq("id", item.id);

          if (error) {
            console.error(`Erro ao atualizar ${tabela}:`, error);
            throw error;
          }
        }
      }

      toast({
        title: "Salvo com sucesso",
        description: "Marcações de serviços fora do plano foram atualizadas.",
      });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const intervencoesFiltradas = intervencoes.filter((int) => {
    if (loteFiltro !== "todos" && int.lote_id !== loteFiltro) return false;
    if (tipoFiltro !== "todos" && int.tipo_tabela !== tipoFiltro) return false;
    return true;
  });

  const totalForaPlano = intervencoesFiltradas.filter((i) => i.fora_plano_manutencao).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/minhas-necessidades")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={handleSalvar} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-warning" />
              Revisão de Intervenções - Serviços Fora do Plano
            </CardTitle>
            <CardDescription>
              Marque os serviços executados fora do plano de manutenção aprovado e adicione justificativas.
              Esses serviços serão destacados nos relatórios de medição.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="mb-6 flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Lote</label>
                <Select value={loteFiltro} onValueChange={setLoteFiltro}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os lotes</SelectItem>
                    {lotes.map((lote) => (
                      <SelectItem key={lote.id} value={lote.id}>
                        {lote.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Tipo de Serviço</label>
                <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {TIPOS_INTERVENCAO.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Badge variant="destructive" className="text-lg px-4 py-2">
                  {totalForaPlano} Fora do Plano
                </Badge>
              </div>
            </div>

            {/* Tabela */}
            {loading ? (
              <div className="text-center py-8">Carregando intervenções...</div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Fora do Plano</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>km</TableHead>
                      <TableHead>Justificativa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {intervencoesFiltradas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhuma intervenção encontrada com os filtros selecionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      intervencoesFiltradas.map((int, index) => {
                        const indexOriginal = intervencoes.findIndex((i) => i.id === int.id);
                        return (
                          <TableRow 
                            key={int.id}
                            className={int.fora_plano_manutencao ? "bg-warning/10" : ""}
                          >
                            <TableCell>
                              <Checkbox
                                checked={int.fora_plano_manutencao}
                                onCheckedChange={() => handleToggleForaPlano(indexOriginal)}
                              />
                            </TableCell>
                            <TableCell>{new Date(int.data_intervencao).toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell className="text-sm">{int.tipo_servico}</TableCell>
                            <TableCell className="text-sm">{int.descricao}</TableCell>
                            <TableCell>{int.km?.toFixed(3)}</TableCell>
                            <TableCell>
                              {int.fora_plano_manutencao ? (
                                <Textarea
                                  value={int.justificativa_fora_plano || ""}
                                  onChange={(e) => handleJustificativaChange(indexOriginal, e.target.value)}
                                  placeholder="Digite a justificativa (obrigatório)"
                                  className="min-h-[60px]"
                                />
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
