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
import { ArrowLeft, Save, AlertTriangle, CheckCircle, XCircle, Eye, GitCompareArrows } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

interface IntervencaoPendente {
  id: string;
  tipo_tabela: string;
  tipo_label: string;
  data_intervencao: string;
  motivo: string;
  km: number;
  detalhes: any;
  foto_url?: string;
  observacao?: string;
}

export default function RevisaoIntervencoes() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast } = useToast();
  
  // Estados para aprovação de intervenções
  const [loadingPendentes, setLoadingPendentes] = useState(true);
  const [intervencoesPendentes, setIntervencoesPendentes] = useState<IntervencaoPendente[]>([]);
  const [intervencaoSelecionada, setIntervencaoSelecionada] = useState<IntervencaoPendente | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [observacaoCoordenador, setObservacaoCoordenador] = useState("");
  const [processando, setProcessando] = useState(false);
  
  // Estados para marcação fora do plano (código existente)
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [intervencoes, setIntervencoes] = useState<IntervencaoRow[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [rodovias, setRodovias] = useState<any[]>([]);
  const [loteFiltro, setLoteFiltro] = useState<string>("todos");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");

  const TIPOS_INTERVENCAO = [
    { value: "intervencoes_sh", label: "SH - Sinalização Horizontal", funcaoRPC: null },
    { value: "intervencoes_inscricoes", label: "Inscrições", funcaoRPC: null },
    { value: "intervencoes_sv", label: "SV - Sinalização Vertical", funcaoRPC: null },
    { value: "intervencoes_tacha", label: "Tachas", funcaoRPC: null },
    { value: "ficha_marcas_longitudinais_intervencoes", label: "Marcas Longitudinais", funcaoRPC: "aplicar_intervencao_marcas_longitudinais" },
    { value: "ficha_cilindros_intervencoes", label: "Cilindros", funcaoRPC: "aplicar_intervencao_cilindros" },
    { value: "ficha_porticos_intervencoes", label: "Pórticos", funcaoRPC: "aplicar_intervencao_portico" },
    { value: "defensas_intervencoes", label: "Defensas", funcaoRPC: "aplicar_intervencao_defensas" },
    { value: "ficha_inscricoes_intervencoes", label: "Inscrições (Ficha)", funcaoRPC: "aplicar_intervencao_inscricoes" },
    { value: "ficha_tachas_intervencoes", label: "Tachas (Ficha)", funcaoRPC: "aplicar_intervencao_tachas" },
    { value: "ficha_placa_intervencoes", label: "Placas", funcaoRPC: "aplicar_intervencao_placa" },
  ];

  useEffect(() => {
    if (session) {
      carregarIntervencoesPendentes();
      carregarDados();
    }
  }, [session]);

  const carregarIntervencoesPendentes = async () => {
    try {
      setLoadingPendentes(true);
      const pendentes: IntervencaoPendente[] = [];

      for (const tipo of TIPOS_INTERVENCAO) {
        if (!tipo.funcaoRPC) continue; // Pular tipos sem função de aplicação

        const { data, error } = await supabase
          .from(tipo.value as any)
          .select("*")
          .eq("pendente_aprovacao_coordenador", true)
          .order("data_intervencao", { ascending: false });

        if (error) {
          console.error(`Erro ao carregar pendentes ${tipo.label}:`, error);
          continue;
        }

        if (data) {
          data.forEach((item: any) => {
            pendentes.push({
              id: item.id,
              tipo_tabela: tipo.value,
              tipo_label: tipo.label,
              data_intervencao: item.data_intervencao,
              motivo: item.motivo || "Intervenção",
              km: item.km_inicial || item.km || 0,
              detalhes: item,
              foto_url: item.foto_url,
              observacao: item.observacao,
            });
          });
        }
      }

      setIntervencoesPendentes(pendentes);
    } catch (error) {
      console.error("Erro ao carregar intervenções pendentes:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as intervenções pendentes.",
        variant: "destructive",
      });
    } finally {
      setLoadingPendentes(false);
    }
  };

  const abrirDialogoDetalhes = (intervencao: IntervencaoPendente) => {
    setIntervencaoSelecionada(intervencao);
    setObservacaoCoordenador("");
    setDialogOpen(true);
  };

  const aprovarIntervencao = async () => {
    if (!intervencaoSelecionada) return;

    try {
      setProcessando(true);

      const tipoConfig = TIPOS_INTERVENCAO.find(t => t.value === intervencaoSelecionada.tipo_tabela);
      if (!tipoConfig?.funcaoRPC) {
        throw new Error("Função RPC não encontrada para este tipo");
      }

      // Chamar função RPC para aplicar ao inventário
      const { error: rpcError } = await supabase.rpc(tipoConfig.funcaoRPC as any, {
        p_intervencao_id: intervencaoSelecionada.id,
        p_coordenador_id: session?.user.id,
      });

      if (rpcError) throw rpcError;

      // Atualizar observação do coordenador se houver
      if (observacaoCoordenador.trim()) {
        await supabase
          .from(intervencaoSelecionada.tipo_tabela as any)
          .update({ observacao_coordenador: observacaoCoordenador })
          .eq("id", intervencaoSelecionada.id);
      }

      toast({
        title: "Intervenção aprovada",
        description: "Intervenção aplicada ao inventário dinâmico com sucesso.",
      });

      setDialogOpen(false);
      carregarIntervencoesPendentes();
    } catch (error: any) {
      console.error("Erro ao aprovar intervenção:", error);
      toast({
        title: "Erro ao aprovar",
        description: error.message || "Não foi possível aprovar a intervenção.",
        variant: "destructive",
      });
    } finally {
      setProcessando(false);
    }
  };

  const rejeitarIntervencao = async () => {
    if (!intervencaoSelecionada) return;

    if (!observacaoCoordenador.trim()) {
      toast({
        title: "Observação obrigatória",
        description: "Adicione uma observação explicando a rejeição.",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessando(true);

      const { error } = await supabase
        .from(intervencaoSelecionada.tipo_tabela as any)
        .update({
          pendente_aprovacao_coordenador: false,
          aplicado_ao_inventario: false,
          observacao_coordenador: observacaoCoordenador,
          coordenador_id: session?.user.id,
          data_aprovacao_coordenador: new Date().toISOString(),
        })
        .eq("id", intervencaoSelecionada.id);

      if (error) throw error;

      toast({
        title: "Intervenção rejeitada",
        description: "O técnico será notificado da rejeição.",
        variant: "destructive",
      });

      setDialogOpen(false);
      carregarIntervencoesPendentes();
    } catch (error: any) {
      console.error("Erro ao rejeitar intervenção:", error);
      toast({
        title: "Erro ao rejeitar",
        description: error.message || "Não foi possível rejeitar a intervenção.",
        variant: "destructive",
      });
    } finally {
      setProcessando(false);
    }
  };

  const carregarDados = async () => {
    try {
      setLoading(true);

      const { data: lotesData } = await supabase.from("lotes").select("*");
      const { data: rodoviasData } = await supabase.from("rodovias").select("*");
      
      setLotes(lotesData || []);
      setRodovias(rodoviasData || []);

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

            if (tipo.value === "intervencoes_sh") {
              descricao = `${item.tipo_demarcacao || ""} - ${item.cor || ""} - ${item.extensao_metros || 0}m`;
            } else if (tipo.value === "intervencoes_tacha") {
              descricao = `${item.refletivo || ""} - ${item.quantidade || 0} unid.`;
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

      const porTabela: Record<string, IntervencaoRow[]> = {};
      intervencoes.forEach((int) => {
        if (!porTabela[int.tipo_tabela]) {
          porTabela[int.tipo_tabela] = [];
        }
        porTabela[int.tipo_tabela].push(int);
      });

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
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>

        <Tabs defaultValue="aprovacao" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="aprovacao" className="flex items-center gap-2">
              <GitCompareArrows className="h-4 w-4" />
              Aprovar Intervenções
              {intervencoesPendentes.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {intervencoesPendentes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="fora-plano" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Serviços Fora do Plano
            </TabsTrigger>
          </TabsList>

          {/* Aba 1: Aprovação de Intervenções */}
          <TabsContent value="aprovacao">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCompareArrows className="h-6 w-6 text-primary" />
                  Aprovação de Intervenções - Inventário Dinâmico
                </CardTitle>
                <CardDescription>
                  Revise e aprove as intervenções registradas pelos técnicos. Ao aprovar, as alterações
                  serão aplicadas automaticamente ao inventário dinâmico.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPendentes ? (
                  <div className="text-center py-8">Carregando intervenções pendentes...</div>
                ) : intervencoesPendentes.length === 0 ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Não há intervenções pendentes de aprovação no momento.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>KM</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {intervencoesPendentes.map((int) => (
                        <TableRow key={int.id}>
                          <TableCell>
                            {new Date(int.data_intervencao).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{int.tipo_label}</Badge>
                          </TableCell>
                          <TableCell>{int.motivo}</TableCell>
                          <TableCell>{int.km.toFixed(3)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirDialogoDetalhes(int)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Revisar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba 2: Fora do Plano */}
          <TabsContent value="fora-plano">
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

                  <div className="flex items-end gap-4">
                    <Badge variant="destructive" className="text-lg px-4 py-2">
                      {totalForaPlano} Fora do Plano
                    </Badge>
                    <Button onClick={handleSalvar} disabled={saving}>
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                </div>

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
          </TabsContent>
        </Tabs>

        {/* Dialog de revisão */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Revisar Intervenção</DialogTitle>
              <DialogDescription>
                Revise os detalhes da intervenção e decida se deseja aprovar ou rejeitar.
              </DialogDescription>
            </DialogHeader>

            {intervencaoSelecionada && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Tipo</label>
                    <p className="text-sm text-muted-foreground">{intervencaoSelecionada.tipo_label}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Data</label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(intervencaoSelecionada.data_intervencao).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Motivo</label>
                    <p className="text-sm text-muted-foreground">{intervencaoSelecionada.motivo}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">KM</label>
                    <p className="text-sm text-muted-foreground">{intervencaoSelecionada.km.toFixed(3)}</p>
                  </div>
                </div>

                {intervencaoSelecionada.foto_url && (
                  <div>
                    <label className="text-sm font-medium">Foto</label>
                    <img 
                      src={intervencaoSelecionada.foto_url} 
                      alt="Foto da intervenção"
                      className="w-full max-h-96 object-contain rounded-lg border mt-2"
                    />
                  </div>
                )}

                {intervencaoSelecionada.observacao && (
                  <div>
                    <label className="text-sm font-medium">Observação do Técnico</label>
                    <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded">
                      {intervencaoSelecionada.observacao}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">Observação do Coordenador</label>
                  <Textarea
                    value={observacaoCoordenador}
                    onChange={(e) => setObservacaoCoordenador(e.target.value)}
                    placeholder="Adicione uma observação (obrigatório em caso de rejeição)"
                    className="mt-2"
                    rows={4}
                  />
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Ao aprovar, esta intervenção será <strong>automaticamente aplicada ao inventário dinâmico</strong>, 
                    atualizando o cadastro e criando um registro no histórico de modificações.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <DialogFooter className="flex gap-2">
              <Button
                variant="destructive"
                onClick={rejeitarIntervencao}
                disabled={processando}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Rejeitar
              </Button>
              <Button
                variant="default"
                onClick={aprovarIntervencao}
                disabled={processando}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {processando ? "Processando..." : "Aprovar e Aplicar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
