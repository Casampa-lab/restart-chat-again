import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle, Eye, Loader2, RefreshCw } from "lucide-react";
import { aprovarElemento, rejeitarElemento } from "@/lib/elementosPendentesActions";
import { ElementoDataDisplay } from "@/components/ElementoDataDisplay";

export default function ElementosPendentes() {
  const navigate = useNavigate();
  const [selectedElemento, setSelectedElemento] = useState<any>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>("pendente_aprovacao");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const { data: elementos, isLoading, refetch } = useQuery({
    queryKey: ["elementos-pendentes", filtroStatus, filtroTipo],
    queryFn: async () => {
      console.log('🔄 Buscando elementos pendentes...');
      const startTime = Date.now();
      let query = supabase
        .from("elementos_pendentes_aprovacao")
        .select("*")
        .order("created_at", { ascending: false });

      if (filtroStatus !== "todos") {
        query = query.eq("status", filtroStatus);
      }

      if (filtroTipo !== "todos") {
        query = query.eq("tipo_elemento", filtroTipo);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Erro na query:', error);
        throw error;
      }

      // Buscar dados relacionados para cada elemento
      if (data && data.length > 0) {
        const enrichedData = await Promise.all(
          data.map(async (elemento) => {
            // Buscar perfil do usuário
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("nome, email")
              .eq("id", elemento.user_id)
              .single();

            // Buscar rodovia
            const { data: rodovia } = await supabase
              .from("rodovias")
              .select("codigo")
              .eq("id", elemento.rodovia_id)
              .single();

            // Buscar lote
            const { data: lote } = await supabase
              .from("lotes")
              .select("numero")
              .eq("id", elemento.lote_id)
              .single();

            return {
              ...elemento,
              user_profile: userProfile,
              rodovia,
              lote
            };
          })
        );

        console.log(`✅ ${enrichedData.length} elementos encontrados em ${Date.now() - startTime}ms`);
        setLastUpdate(new Date());
        return enrichedData;
      }
      
      setLastUpdate(new Date());
      return data;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const handleAprovar = async () => {
    if (!selectedElemento) return;
    
    setIsProcessing(true);
    const result = await aprovarElemento(selectedElemento.id, observacao);
    setIsProcessing(false);

    if (result.success) {
      setShowApprovalDialog(false);
      setSelectedElemento(null);
      setObservacao("");
      refetch();
    }
  };

  const handleRejeitar = async () => {
    if (!selectedElemento) return;

    if (!observacao.trim()) {
      toast.error("Observação é obrigatória para rejeição");
      return;
    }

    setIsProcessing(true);
    const result = await rejeitarElemento(selectedElemento.id, observacao);
    setIsProcessing(false);

    if (result.success) {
      setShowRejectionDialog(false);
      setSelectedElemento(null);
      setObservacao("");
      refetch();
      
      // Toast informando que NC foi criada como rascunho
      toast.success('Elemento rejeitado e NC criada', {
        description: 'Uma NC foi criada automaticamente. Revise em "NCs Coordenador" antes de notificar a executora.'
      });
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      marcas_longitudinais: 'Marcas Longitudinais',
      placas: 'Placas',
      tachas: 'Tachas',
      inscricoes: 'Inscrições',
      cilindros: 'Cilindros',
      porticos: 'Pórticos',
      defensas: 'Defensas'
    };
    return labels[tipo] || tipo;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pendente_aprovacao: { variant: "secondary", label: "Pendente" },
      aprovado: { variant: "default", label: "Aprovado" },
      rejeitado: { variant: "destructive", label: "Rejeitado" }
    };
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate("/coordenacao-fiscalizacao")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold">Elementos Pendentes de Aprovação</h1>
          <p className="text-muted-foreground">
            Revise e aprove elementos não cadastrados registrados pelos técnicos
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente_aprovacao">Pendentes</SelectItem>
                  <SelectItem value="aprovado">Aprovados</SelectItem>
                  <SelectItem value="rejeitado">Rejeitados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Elemento</Label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="marcas_longitudinais">Marcas Longitudinais</SelectItem>
                  <SelectItem value="placas">Placas</SelectItem>
                  <SelectItem value="tachas">Tachas</SelectItem>
                  <SelectItem value="inscricoes">Inscrições</SelectItem>
                  <SelectItem value="cilindros">Cilindros</SelectItem>
                  <SelectItem value="porticos">Pórticos</SelectItem>
                  <SelectItem value="defensas">Defensas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-2">Carregando...</p>
            </div>
          ) : elementos && elementos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Rodovia/Lote</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {elementos.map((elemento: any) => (
                  <TableRow key={elemento.id}>
                    <TableCell>
                      {new Date(elemento.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{elemento.user_profile?.nome}</p>
                        <p className="text-xs text-muted-foreground">{elemento.user_profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTipoLabel(elemento.tipo_elemento)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{elemento.rodovia?.codigo}</p>
                        <p className="text-muted-foreground">Lote {elemento.lote?.numero}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(elemento.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedElemento(elemento)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {elemento.status === "pendente_aprovacao" && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              setSelectedElemento(elemento);
                              setShowApprovalDialog(true);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedElemento(elemento);
                              setShowRejectionDialog(true);
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum elemento encontrado com os filtros aplicados
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={!!selectedElemento && !showApprovalDialog && !showRejectionDialog} onOpenChange={() => setSelectedElemento(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Elemento</DialogTitle>
          </DialogHeader>
          {selectedElemento && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <p>{getTipoLabel(selectedElemento.tipo_elemento)}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  {getStatusBadge(selectedElemento.status)}
                </div>
              </div>
              
              <div>
                <Label>Justificativa do Técnico</Label>
                <p className="text-sm bg-muted p-3 rounded mt-1">{selectedElemento.justificativa}</p>
              </div>

              {selectedElemento.observacao_coordenador && (
                <div>
                  <Label>Observação do Coordenador</Label>
                  <p className="text-sm bg-muted p-3 rounded mt-1">{selectedElemento.observacao_coordenador}</p>
                </div>
              )}

              {selectedElemento.fotos_urls && selectedElemento.fotos_urls.length > 0 && (
                <div>
                  <Label>Fotos</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {selectedElemento.fotos_urls.map((url: string, index: number) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-32 object-cover rounded border"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-base font-semibold">Dados do Elemento</Label>
                <ElementoDataDisplay 
                  dados_elemento={selectedElemento.dados_elemento}
                  tipo_elemento={selectedElemento.tipo_elemento}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Aprovação */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Elemento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Tem certeza que deseja aprovar este elemento? Ele será adicionado ao inventário dinâmico automaticamente.</p>
            <div>
              <Label htmlFor="obs-aprovacao">Observação (opcional)</Label>
              <Textarea
                id="obs-aprovacao"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Adicione observações se necessário..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button onClick={handleAprovar} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirmar Aprovação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Elemento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Tem certeza que deseja rejeitar este elemento? Uma NC será criada automaticamente.</p>
            <div>
              <Label htmlFor="obs-rejeicao">Motivo da Rejeição *</Label>
              <Textarea
                id="obs-rejeicao"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Explique o motivo da rejeição..."
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRejeitar} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Confirmar Rejeição
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
