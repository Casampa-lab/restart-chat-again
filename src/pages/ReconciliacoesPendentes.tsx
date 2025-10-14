import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MapPin, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ReconciliacoesPendentes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [observacoes, setObservacoes] = useState<Record<string, string>>({});

  // Buscar reconciliações pendentes
  const { data: reconciliacoes, isLoading } = useQuery({
    queryKey: ["reconciliacoes-pendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("necessidades_placas")
        .select(`
          *,
          cadastro:ficha_placa!cadastro_id(*),
          rodovia:rodovias(codigo, uf),
          lote:lotes(numero)
        `)
        .eq("status_reconciliacao", "pendente_aprovacao")
        .order("solicitado_em", { ascending: false });

      if (error) throw error;
      
      // Buscar informações dos solicitantes
      const userIds = data?.map(d => d.solicitado_por).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome")
        .in("id", userIds);
      
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data?.map(item => ({
        ...item,
        solicitante: item.solicitado_por ? profilesMap.get(item.solicitado_por) : null
      })) || [];
    }
  });

  // Mutation para aprovar/rejeitar
  const decidirMutation = useMutation({
    mutationFn: async ({ 
      id, 
      decisao, 
      observacao 
    }: { 
      id: string; 
      decisao: "aprovar" | "rejeitar"; 
      observacao?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const updateData: any = {
        aprovado_por: user.id,
        aprovado_em: new Date().toISOString(),
        observacao_coordenador: observacao,
      };

      if (decisao === "aprovar") {
        updateData.status_reconciliacao = "aprovado";
        updateData.servico_final = "Substituir";
        updateData.servico = "Substituir";
        updateData.reconciliado = true;
      } else {
        updateData.status_reconciliacao = "rejeitado";
        updateData.servico_final = updateData.solucao_planilha || "Implantar";
      }

      const { error } = await supabase
        .from("necessidades_placas")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliacoes-pendentes"] });
      toast.success("Decisão registrada com sucesso!");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao registrar decisão");
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="text-center">Carregando reconciliações...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-3xl font-bold">🔍 Reconciliações Pendentes</h1>
                <p className="text-sm text-muted-foreground">Aprovar ou rejeitar substituições solicitadas pelo campo</p>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {reconciliacoes?.length || 0} pendentes
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto p-6 space-y-4">
        {reconciliacoes?.map((item) => (
          <Card key={item.id} className="border-2 border-yellow-200 shadow-md">
            <CardHeader className="bg-yellow-50/50">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span>km {item.km?.toFixed(2)} - {item.rodovia?.codigo || "N/A"} ({item.rodovia?.uf || ""})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Lote {item.lote?.numero || "N/A"}
                  </Badge>
                  {item.solicitante && (
                    <Badge variant="secondary" className="text-xs">
                      Solicitado por: {item.solicitante.nome || "N/A"}
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 pt-6">
              {/* Comparação Lado a Lado */}
              <div className="grid grid-cols-2 gap-4">
                {/* Cadastro */}
                <div className="border-2 border-green-500 rounded-lg p-4 space-y-2">
                  <div className="font-semibold text-green-700 flex items-center gap-2">
                    <span className="text-xl">📷</span>
                    Inventário (Cadastro)
                  </div>
                  <div className="text-sm space-y-1">
                    <div><strong>Código:</strong> {item.cadastro?.codigo || "N/A"}</div>
                    <div><strong>Tipo:</strong> {item.cadastro?.tipo || "N/A"}</div>
                    <div><strong>km:</strong> {item.cadastro?.km?.toFixed(3) || "N/A"}</div>
                    <div><strong>Lado:</strong> {item.cadastro?.lado || "N/A"}</div>
                    <div><strong>Suporte:</strong> {item.cadastro?.suporte || "N/A"}</div>
                  </div>
                  {item.cadastro?.foto_frontal_url && (
                    <img 
                      src={item.cadastro.foto_frontal_url}
                      alt="Cadastro"
                      className="w-full rounded border mt-2"
                    />
                  )}
                </div>

                {/* Projeto */}
                <div className="border-2 border-primary rounded-lg p-4 space-y-2">
                  <div className="font-semibold text-primary flex items-center gap-2">
                    <span className="text-xl">🎨</span>
                    Projeto (Necessidade)
                  </div>
                  <Badge className="w-full justify-center bg-primary text-base py-2">
                    {item.solucao_planilha || item.servico}
                  </Badge>
                  <div className="text-sm space-y-1">
                    <div><strong>Código:</strong> {item.codigo || "N/A"}</div>
                    <div><strong>Tipo:</strong> {item.tipo || "N/A"}</div>
                    <div><strong>km projeto:</strong> {item.km?.toFixed(3) || "N/A"}</div>
                    <div><strong>Lado:</strong> {item.lado || "N/A"}</div>
                    <div className="pt-2 border-t">
                      <Badge variant="outline" className="text-xs">
                        📍 Match GPS: {item.distancia_match_metros?.toFixed(1) || "0"}m
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Observação do Usuário */}
              {item.observacao_usuario && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                  <div className="text-xs font-medium text-blue-800 mb-1">
                    💬 Observação do usuário de campo:
                  </div>
                  <p className="text-sm">{item.observacao_usuario}</p>
                </div>
              )}

              {/* Campo de Observação do Coordenador */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Observação do coordenador (opcional)
                </label>
                <Textarea
                  placeholder="Ex: Confirmado em campo que é a mesma placa..."
                  value={observacoes[item.id] || ""}
                  onChange={(e) => setObservacoes({ ...observacoes, [item.id]: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Botões de Decisão */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  onClick={() => decidirMutation.mutate({ 
                    id: item.id, 
                    decisao: "aprovar",
                    observacao: observacoes[item.id]
                  })}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={decidirMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Aprovar Substituição
                </Button>
                <Button
                  onClick={() => decidirMutation.mutate({ 
                    id: item.id, 
                    decisao: "rejeitar",
                    observacao: observacoes[item.id]
                  })}
                  variant="destructive"
                  disabled={decidirMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeitar - Manter Implantação
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {!reconciliacoes?.length && (
          <Card className="border-dashed">
            <CardContent className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">✓ Nenhuma reconciliação pendente</p>
              <p className="text-sm mt-1">Todas as solicitações foram processadas</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
