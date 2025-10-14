import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface IntervencaoPendente {
  id: string;
  tipo_elemento: string;
  data_intervencao: string;
  motivo: string;
  km?: number;
  km_inicial?: number;
  cadastro?: any;
  fora_plano_manutencao?: boolean;
  justificativa_fora_plano?: string;
  ficha_placa_id?: string;
  ficha_porticos_id?: string;
}

export default function IntervencoesPendentes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [selectedIntervencao, setSelectedIntervencao] = useState<IntervencaoPendente | null>(null);
  const [observacao, setObservacao] = useState("");
  const [dialogAction, setDialogAction] = useState<"aprovar" | "rejeitar" | null>(null);

  const { data: pendentes, isLoading } = useQuery({
    queryKey: ["intervencoes-pendentes"],
    queryFn: async () => {
      const results: IntervencaoPendente[] = [];
      
      // Buscar placas
      const { data: placas } = await supabase
        .from("ficha_placa_intervencoes")
        .select(`
          *,
          cadastro:ficha_placa!ficha_placa_id(*)
        `)
        .eq("pendente_aprovacao_coordenador", true)
        .order("data_intervencao", { ascending: false });

      if (placas) {
        results.push(...placas.map((p: any) => ({
          ...p,
          tipo_elemento: "Placas",
          cadastro: p.cadastro,
        })));
      }

      // Buscar pórticos
      const { data: porticos } = await supabase
        .from("ficha_porticos_intervencoes")
        .select(`
          *,
          cadastro:ficha_porticos!ficha_porticos_id(*)
        `)
        .eq("pendente_aprovacao_coordenador", true)
        .order("data_intervencao", { ascending: false });

      if (porticos) {
        results.push(...porticos.map((p: any) => ({
          ...p,
          tipo_elemento: "Pórticos",
          cadastro: p.cadastro,
        })));
      }
      
      return results;
    },
    enabled: !!user,
  });

  const aprovarMutation = useMutation({
    mutationFn: async (intervencao: IntervencaoPendente) => {
      const funcaoMap: Record<string, "aplicar_intervencao_placa" | "aplicar_intervencao_portico"> = {
        "Placas": "aplicar_intervencao_placa",
        "Pórticos": "aplicar_intervencao_portico",
      };

      const funcao = funcaoMap[intervencao.tipo_elemento];
      
      if (!funcao) {
        throw new Error(`Função não implementada para ${intervencao.tipo_elemento}`);
      }

      const { error } = await supabase.rpc(funcao, {
        p_intervencao_id: intervencao.id,
        p_coordenador_id: user!.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Intervenção aprovada e aplicada ao inventário!");
      queryClient.invalidateQueries({ queryKey: ["intervencoes-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["contador-pendentes"] });
      setSelectedIntervencao(null);
      setDialogAction(null);
      setObservacao("");
    },
    onError: (error: any) => {
      toast.error(`Erro ao aprovar: ${error.message}`);
    },
  });

  const rejeitarMutation = useMutation({
    mutationFn: async ({ intervencao, obs }: { intervencao: IntervencaoPendente; obs: string }) => {
      const tabelaMap: Record<string, "ficha_placa_intervencoes" | "ficha_porticos_intervencoes"> = {
        "Placas": "ficha_placa_intervencoes",
        "Pórticos": "ficha_porticos_intervencoes",
      };

      const tabela = tabelaMap[intervencao.tipo_elemento];

      const { error } = await supabase
        .from(tabela)
        .update({
          pendente_aprovacao_coordenador: false,
          coordenador_id: user!.id,
          data_aprovacao_coordenador: new Date().toISOString(),
          observacao_coordenador: obs,
        })
        .eq("id", intervencao.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Intervenção rejeitada!");
      queryClient.invalidateQueries({ queryKey: ["intervencoes-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["contador-pendentes"] });
      setSelectedIntervencao(null);
      setDialogAction(null);
      setObservacao("");
    },
    onError: (error: any) => {
      toast.error(`Erro ao rejeitar: ${error.message}`);
    },
  });

  const handleAprovar = (intervencao: IntervencaoPendente) => {
    setSelectedIntervencao(intervencao);
    setDialogAction("aprovar");
  };

  const handleRejeitar = (intervencao: IntervencaoPendente) => {
    setSelectedIntervencao(intervencao);
    setDialogAction("rejeitar");
  };

  const confirmAction = () => {
    if (!selectedIntervencao) return;

    if (dialogAction === "aprovar") {
      aprovarMutation.mutate(selectedIntervencao);
    } else if (dialogAction === "rejeitar") {
      if (!observacao.trim()) {
        toast.error("Observação obrigatória para rejeição");
        return;
      }
      rejeitarMutation.mutate({ intervencao: selectedIntervencao, obs: observacao });
    }
  };

  const pendentesFiltrados = pendentes?.filter(p => 
    filtroTipo === "todos" || p.tipo_elemento === filtroTipo
  ) || [];

  if (isLoading) {
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/coordenacao-fiscalizacao")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold">Intervenções Pendentes</h1>
            <Badge variant="secondary" className="text-lg">
              {pendentesFiltrados.length}
            </Badge>
          </div>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Placas">Placas</SelectItem>
              <SelectItem value="Pórticos">Pórticos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Intervenções Aguardando Aprovação</CardTitle>
          </CardHeader>
          <CardContent>
            {pendentesFiltrados.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma intervenção pendente de aprovação.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>km</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendentesFiltrados.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline">{item.tipo_elemento}</Badge>
                      </TableCell>
                      <TableCell>{new Date(item.data_intervencao).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>{item.cadastro?.km || item.cadastro?.km_inicial || "-"}</TableCell>
                      <TableCell>{item.motivo}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">
                          🟡 Pendente
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" onClick={() => handleAprovar(item)}>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRejeitar(item)}>
                            <XCircle className="w-4 h-4 mr-1" />
                            Rejeitar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogAction !== null} onOpenChange={() => {
        setDialogAction(null);
        setSelectedIntervencao(null);
        setObservacao("");
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialogAction === "aprovar" ? "Aprovar Intervenção" : "Rejeitar Intervenção"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedIntervencao && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Tipo:</strong> {selectedIntervencao.tipo_elemento}
                </div>
                <div>
                  <strong>Data:</strong> {new Date(selectedIntervencao.data_intervencao).toLocaleDateString("pt-BR")}
                </div>
                <div>
                  <strong>Motivo:</strong> {selectedIntervencao.motivo}
                </div>
                <div>
                  <strong>km:</strong> {selectedIntervencao.cadastro?.km || selectedIntervencao.cadastro?.km_inicial || "-"}
                </div>
              </div>

              {dialogAction === "aprovar" ? (
                <div className="bg-green-50 p-4 rounded-md border border-green-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-900">Confirmar Aprovação</p>
                      <p className="text-sm text-green-700">
                        Esta intervenção será aplicada ao inventário automaticamente e registrada no histórico.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Observação da Rejeição <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Descreva o motivo da rejeição..."
                    rows={4}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDialogAction(null);
              setSelectedIntervencao(null);
              setObservacao("");
            }}>
              Cancelar
            </Button>
            <Button
              variant={dialogAction === "aprovar" ? "default" : "destructive"}
              onClick={confirmAction}
              disabled={aprovarMutation.isPending || rejeitarMutation.isPending}
            >
              {dialogAction === "aprovar" ? "Confirmar Aprovação" : "Confirmar Rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
