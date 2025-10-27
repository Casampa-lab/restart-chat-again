import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, XCircle, Eye, GitCompareArrows } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

type TipoIntervencao = 
  | "ficha_marcas_longitudinais_intervencoes"
  | "ficha_cilindros_intervencoes"
  | "ficha_porticos_intervencoes"
  | "defensas_intervencoes"
  | "ficha_inscricoes_intervencoes"
  | "ficha_tachas_intervencoes"
  | "ficha_placa_intervencoes";

interface IntervencaoPendente {
  id: string;
  tipo_tabela: string;
  tipo_label: string;
  data_intervencao: string;
  motivo: string;
  km: number;
  tipo_origem: "execucao" | "manutencao_pre_projeto";
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

  const TIPOS_INTERVENCAO = [
    { value: "ficha_marcas_longitudinais_intervencoes", label: "Marcas Longitudinais", funcaoRPC: "aplicar_intervencao_marcas_longitudinais" },
    { value: "ficha_cilindros_intervencoes", label: "Cilindros", funcaoRPC: "aplicar_intervencao_cilindros" },
    { value: "ficha_porticos_intervencoes", label: "Pórticos", funcaoRPC: "aplicar_intervencao_portico" },
    { value: "defensas_intervencoes", label: "Defensas", funcaoRPC: "aplicar_intervencao_defensas" },
    { value: "ficha_inscricoes_intervencoes", label: "Inscrições", funcaoRPC: "aplicar_intervencao_inscricoes" },
    { value: "ficha_tachas_intervencoes", label: "Tachas", funcaoRPC: "aplicar_intervencao_tachas" },
    { value: "ficha_placa_intervencoes", label: "Placas", funcaoRPC: "aplicar_intervencao_placa" },
  ];

  useEffect(() => {
    if (session) {
      carregarIntervencoesPendentes();
    }
  }, [session]);

  const carregarIntervencoesPendentes = async () => {
    try {
      setLoadingPendentes(true);
      const pendentes: IntervencaoPendente[] = [];

      for (const tipo of TIPOS_INTERVENCAO) {
        if (!tipo.funcaoRPC) continue;

        const { data, error } = await supabase
          .from(tipo.value as any)
          .select("*, tipo_origem")
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
              km: item.km_inicial || 0,
              tipo_origem: item.tipo_origem,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCompareArrows className="h-6 w-6 text-primary" />
              Intervenções Pendentes
              {intervencoesPendentes.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {intervencoesPendentes.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Revise e aprove as intervenções registradas pelos técnicos. 
              Ao aprovar, as alterações serão aplicadas automaticamente ao inventário dinâmico.
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
                    <TableHead>Origem</TableHead>
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
                      <TableCell>
                        {int.tipo_origem === "manutencao_pre_projeto" ? (
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-orange-500" />
                            <span className="text-sm text-muted-foreground">Manutenção</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-blue-500" />
                            <span className="text-sm text-muted-foreground">Projeto</span>
                          </div>
                        )}
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Revisar Intervenção - {intervencaoSelecionada?.tipo_label}</DialogTitle>
            </DialogHeader>

            {intervencaoSelecionada && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Data da Intervenção</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(intervencaoSelecionada.data_intervencao).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">KM</p>
                    <p className="text-sm text-muted-foreground">{intervencaoSelecionada.km.toFixed(3)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium">Motivo da Intervenção</p>
                  <p className="text-sm text-muted-foreground">{intervencaoSelecionada.motivo}</p>
                </div>

                {intervencaoSelecionada.foto_url && (
                  <div>
                    <p className="text-sm font-medium">Foto</p>
                    <img 
                      src={intervencaoSelecionada.foto_url} 
                      alt="Foto da intervenção"
                      className="w-full max-h-96 object-contain rounded-lg border mt-2"
                    />
                  </div>
                )}

                {intervencaoSelecionada.observacao && (
                  <div>
                    <p className="text-sm font-medium">Observação do Técnico</p>
                    <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded">
                      {intervencaoSelecionada.observacao}
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="observacao">Observação do Coordenador (obrigatória para rejeição)</Label>
                  <Textarea
                    id="observacao"
                    value={observacaoCoordenador}
                    onChange={(e) => setObservacaoCoordenador(e.target.value)}
                    placeholder="Adicione comentários sobre a revisão..."
                    rows={4}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setIntervencaoSelecionada(null);
                      setObservacaoCoordenador("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={rejeitarIntervencao}
                    disabled={processando}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rejeitar
                  </Button>
                  <Button
                    onClick={aprovarIntervencao}
                    disabled={processando}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Aprovar e Aplicar ao Inventário
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
