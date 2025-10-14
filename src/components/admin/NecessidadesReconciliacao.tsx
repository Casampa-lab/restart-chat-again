import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Divergencia {
  id: string;
  km: number;
  codigo: string;
  tipo: string;
  solucao_planilha: string;
  servico_inferido: string;
  servico_final: string;
  distancia_match_metros: number | null;
  cadastro_id: string | null;
  divergencia: boolean;
  reconciliado: boolean;
}

export function NecessidadesReconciliacao() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedNecessidade, setSelectedNecessidade] = useState<Divergencia | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [decisao, setDecisao] = useState<"projeto" | "inferencia" | null>(null);

  // Buscar divergências não reconciliadas
  const { data: divergencias, isLoading } = useQuery({
    queryKey: ["divergencias-nao-reconciliadas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("necessidades_placas")
        .select("id, km, codigo, tipo, solucao_planilha, servico_inferido, servico_final, distancia_match_metros, cadastro_id, divergencia, reconciliado")
        .eq("divergencia", true)
        .eq("reconciliado", false)
        .order("km", { ascending: true });

      if (error) throw error;
      return data as Divergencia[];
    },
    enabled: !!user,
  });

  // Estatísticas
  const { data: estatisticas } = useQuery({
    queryKey: ["estatisticas-divergencias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("necessidades_placas")
        .select("divergencia, reconciliado")
        .eq("divergencia", true);

      if (error) throw error;

      const total = data.length;
      const reconciliadas = data.filter(d => d.reconciliado).length;
      const pendentes = total - reconciliadas;

      return { total, reconciliadas, pendentes };
    },
    enabled: !!user,
  });

  // Mutation para reconciliar
  const reconciliarMutation = useMutation({
    mutationFn: async ({ 
      necessidadeId, 
      servicoFinal, 
      justificativa 
    }: { 
      necessidadeId: string; 
      servicoFinal: string; 
      justificativa: string;
    }) => {
      const { error } = await supabase
        .from("necessidades_placas")
        .update({
          servico_final: servicoFinal,
          servico: servicoFinal, // Atualizar também o campo legado
          reconciliado: true,
          reconciliado_por: user?.id,
          data_reconciliacao: new Date().toISOString(),
          justificativa_reconciliacao: justificativa,
        })
        .eq("id", necessidadeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["divergencias-nao-reconciliadas"] });
      queryClient.invalidateQueries({ queryKey: ["estatisticas-divergencias"] });
      toast({
        title: "Reconciliação concluída",
        description: "A decisão foi registrada com sucesso.",
      });
      setSelectedNecessidade(null);
      setJustificativa("");
      setDecisao(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao reconciliar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReconciliar = () => {
    if (!selectedNecessidade || !decisao) return;

    const servicoFinal = decisao === "projeto" 
      ? selectedNecessidade.solucao_planilha 
      : selectedNecessidade.servico_inferido;

    // Exigir justificativa quando escolher inferência (contrário ao projeto)
    if (decisao === "inferencia" && !justificativa.trim()) {
      toast({
        title: "Justificativa obrigatória",
        description: "Ao escolher a análise automática em vez do projeto, você deve fornecer uma justificativa.",
        variant: "destructive",
      });
      return;
    }

    reconciliarMutation.mutate({
      necessidadeId: selectedNecessidade.id,
      servicoFinal,
      justificativa: justificativa || `Decisão: ${decisao === "projeto" ? "Manter decisão do projeto" : "Usar análise automática"}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Divergências</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{estatisticas?.pendentes || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Reconciliadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{estatisticas?.reconciliadas || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Divergências */}
      <Card>
        <CardHeader>
          <CardTitle>Divergências Pendentes de Reconciliação</CardTitle>
          <CardDescription>
            Necessidades onde a decisão do projeto difere da análise automática do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : divergencias?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>Nenhuma divergência pendente!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KM</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Projeto 🎨</TableHead>
                  <TableHead className="text-center">Sistema 🤖</TableHead>
                  <TableHead className="text-center">Match</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {divergencias?.map((div) => (
                  <TableRow key={div.id}>
                    <TableCell>{div.km?.toFixed(2)}</TableCell>
                    <TableCell className="font-mono text-sm">{div.codigo}</TableCell>
                    <TableCell>{div.tipo}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                        {div.solucao_planilha}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                        {div.servico_inferido}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {div.cadastro_id ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {div.distancia_match_metros?.toFixed(0)}m
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700">
                          Sem match
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedNecessidade(div)}
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Reconciliar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Reconciliação */}
      <Dialog open={!!selectedNecessidade} onOpenChange={() => setSelectedNecessidade(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reconciliar Divergência</DialogTitle>
            <DialogDescription>
              Escolha qual decisão deve prevalecer para esta necessidade
            </DialogDescription>
          </DialogHeader>

          {selectedNecessidade && (
            <div className="space-y-4">
              {/* Informações da Necessidade */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">KM:</span>
                    <span className="ml-2 font-semibold">{selectedNecessidade.km?.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Código:</span>
                    <span className="ml-2 font-mono">{selectedNecessidade.codigo}</span>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Tipo:</span>
                  <span className="ml-2">{selectedNecessidade.tipo}</span>
                </div>
                {selectedNecessidade.cadastro_id && (
                  <div>
                    <span className="text-sm text-muted-foreground">Match encontrado:</span>
                    <span className="ml-2">{selectedNecessidade.distancia_match_metros?.toFixed(0)}m de distância</span>
                  </div>
                )}
              </div>

              {/* Escolha de Decisão */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={decisao === "projeto" ? "default" : "outline"}
                  className="h-auto py-6 flex flex-col gap-2"
                  onClick={() => setDecisao("projeto")}
                >
                  <div className="text-lg font-semibold">🎨 Decisão do Projeto</div>
                  <Badge className="bg-blue-500 text-white">
                    {selectedNecessidade.solucao_planilha}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    Manter a decisão técnica do projetista
                  </div>
                </Button>

                <Button
                  variant={decisao === "inferencia" ? "default" : "outline"}
                  className="h-auto py-6 flex flex-col gap-2"
                  onClick={() => setDecisao("inferencia")}
                >
                  <div className="text-lg font-semibold">🤖 Análise Automática</div>
                  <Badge className="bg-purple-500 text-white">
                    {selectedNecessidade.servico_inferido}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    Usar a análise baseada em GPS
                  </div>
                </Button>
              </div>

              {/* Justificativa (obrigatória para inferência) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Justificativa {decisao === "inferencia" && <span className="text-destructive">*</span>}
                </label>
                <Textarea
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder={
                    decisao === "inferencia"
                      ? "Explique por que a análise automática está correta neste caso..."
                      : "Justificativa opcional para auditoria..."
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedNecessidade(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleReconciliar}
              disabled={!decisao || reconciliarMutation.isPending}
            >
              {reconciliarMutation.isPending ? "Salvando..." : "Confirmar Decisão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
