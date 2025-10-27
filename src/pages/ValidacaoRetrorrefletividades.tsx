import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CheckCircle, XCircle, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import logoOperaVia from "@/assets/logo-operavia-optimized.webp";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StatusFiltro = 'todos' | 'pendente_aprovacao_coordenador' | 'aprovado' | 'rejeitado';

export default function ValidacaoRetrorrefletividades() {
  const navigate = useNavigate();
  const { navigateBack } = useNavigationContext();
  const { user, loading: authLoading } = useAuth();
  const [isAdminOrCoordinator, setIsAdminOrCoordinator] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('pendente_aprovacao_coordenador');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDetalhesOpen, setDialogDetalhesOpen] = useState(false);
  const [acaoAtual, setAcaoAtual] = useState<'aprovar' | 'rejeitar'>('aprovar');
  const [medicaoSelecionada, setMedicaoSelecionada] = useState<any>(null);
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const checkAdminOrCoordinator = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "coordenador"])
        .maybeSingle();
      
      if (!data) {
        toast.error("Acesso negado. Esta função é exclusiva para coordenadores.");
        navigate("/");
        return;
      }
      setIsAdminOrCoordinator(!!data);
    };
    checkAdminOrCoordinator();
  }, [user, navigate]);

  // Query para medições estáticas horizontais
  const { data: medicoeEstaticasHorizontais = [], refetch: refetchEstaticasH } = useQuery({
    queryKey: ['retrorrefletividade-estatica-horizontal', statusFiltro],
    queryFn: async () => {
      let query = supabase
        .from('retrorrefletividade_estatica')
        .select(`
          *,
          lote:lotes(numero),
          rodovia:rodovias(codigo)
        `)
        .eq('tipo_sinalizacao', 'Horizontal')
        .order('data_medicao', { ascending: false });

      if (statusFiltro !== 'todos') {
        query = query.eq('status', statusFiltro);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isAdminOrCoordinator
  });

  // Query para medições estáticas verticais
  const { data: medicoeEstaticasVerticais = [], refetch: refetchEstaticasV } = useQuery({
    queryKey: ['retrorrefletividade-estatica-vertical', statusFiltro],
    queryFn: async () => {
      let query = supabase
        .from('retrorrefletividade_estatica')
        .select(`
          *,
          lote:lotes(numero),
          rodovia:rodovias(codigo)
        `)
        .eq('tipo_sinalizacao', 'Vertical')
        .order('data_medicao', { ascending: false });

      if (statusFiltro !== 'todos') {
        query = query.eq('status', statusFiltro);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isAdminOrCoordinator
  });

  // Query para medições dinâmicas
  const { data: medicoesDinamicas = [], refetch: refetchDinamicas } = useQuery({
    queryKey: ['retrorrefletividade-dinamica', statusFiltro],
    queryFn: async () => {
      let query = supabase
        .from('retrorrefletividade_dinamica')
        .select(`
          *,
          lote:lotes(numero),
          rodovia:rodovias(codigo)
        `)
        .order('data_medicao', { ascending: false });

      if (statusFiltro !== 'todos') {
        query = query.eq('status', statusFiltro);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isAdminOrCoordinator
  });

  const contadorPendentes = 
    medicoeEstaticasHorizontais.filter((m: any) => m.status === 'pendente_aprovacao_coordenador').length +
    medicoeEstaticasVerticais.filter((m: any) => m.status === 'pendente_aprovacao_coordenador').length +
    medicoesDinamicas.filter((m: any) => m.status === 'pendente_aprovacao_coordenador').length;

  const handleAbrirDialog = (medicao: any, acao: 'aprovar' | 'rejeitar') => {
    setMedicaoSelecionada(medicao);
    setAcaoAtual(acao);
    setObservacao('');
    setDialogOpen(true);
  };

  const handleConfirmarAcao = async () => {
    if (!medicaoSelecionada || !user) return;

    if (acaoAtual === 'rejeitar' && !observacao.trim()) {
      toast.error('Observação é obrigatória ao rejeitar uma medição');
      return;
    }

    try {
      const tabela = medicaoSelecionada.tipo_sinalizacao 
        ? 'retrorrefletividade_estatica' 
        : 'retrorrefletividade_dinamica';

      const updates: any = {
        status: acaoAtual === 'aprovar' ? 'aprovado' : 'rejeitado',
        aprovado_coordenador_em: new Date().toISOString(),
        aprovado_por: user.id,
        observacao_coordenador: observacao.trim() || null
      };

      const { error } = await supabase
        .from(tabela)
        .update(updates)
        .eq('id', medicaoSelecionada.id);

      if (error) throw error;

      toast.success(
        acaoAtual === 'aprovar' 
          ? 'Medição aprovada com sucesso!' 
          : 'Medição rejeitada com sucesso!'
      );

      setDialogOpen(false);
      refetchEstaticasH();
      refetchEstaticasV();
      refetchDinamicas();
    } catch (error) {
      console.error('Erro ao processar medição:', error);
      toast.error('Erro ao processar medição. Tente novamente.');
    }
  };

  const handleVisualizarDetalhes = (medicao: any) => {
    setMedicaoSelecionada(medicao);
    setDialogDetalhesOpen(true);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return '-';
    return num.toString().replace('.', ',');
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente_aprovacao_coordenador':
        return <Badge className="bg-yellow-500 text-white">Pendente</Badge>;
      case 'aprovado':
        return <Badge className="bg-green-500 text-white">Aprovado</Badge>;
      case 'rejeitado':
        return <Badge className="bg-red-500 text-white">Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">Rascunho</Badge>;
    }
  };

  const renderTabelaEstaticasHorizontais = () => (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left">Data</th>
              <th className="p-3 text-left">Lote</th>
              <th className="p-3 text-left">Rodovia</th>
              <th className="p-3 text-left">KM</th>
              <th className="p-3 text-left">Posição</th>
              <th className="p-3 text-left">Cor</th>
              <th className="p-3 text-left">Média</th>
              <th className="p-3 text-left">Mín</th>
              <th className="p-3 text-left">Situação</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {medicoeEstaticasHorizontais.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-6 text-center text-muted-foreground">
                  Nenhuma medição encontrada
                </td>
              </tr>
            ) : (
              medicoeEstaticasHorizontais.map((medicao: any) => (
                <tr key={medicao.id} className="border-b hover:bg-muted/20">
                  <td className="p-3">{formatDate(medicao.data_medicao)}</td>
                  <td className="p-3">{medicao.lote?.numero || '-'}</td>
                  <td className="p-3">{medicao.rodovia?.codigo || '-'}</td>
                  <td className="p-3">{formatNumber(medicao.km_referencia)}</td>
                  <td className="p-3">{medicao.posicao_horizontal || '-'}</td>
                  <td className="p-3">{medicao.cor_horizontal || '-'}</td>
                  <td className="p-3 font-semibold">{formatNumber(medicao.valor_medido_horizontal)}</td>
                  <td className="p-3">{formatNumber(medicao.valor_minimo_horizontal)}</td>
                  <td className="p-3">
                    <Badge variant={medicao.situacao_horizontal === 'Conforme' ? 'default' : 'destructive'}>
                      {medicao.situacao_horizontal || '-'}
                    </Badge>
                  </td>
                  <td className="p-3">{renderStatusBadge(medicao.status)}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVisualizarDetalhes(medicao)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {medicao.status === 'pendente_aprovacao_coordenador' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleAbrirDialog(medicao, 'aprovar')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleAbrirDialog(medicao, 'rejeitar')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTabelaEstaticasVerticais = () => (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left">Data</th>
              <th className="p-3 text-left">Lote</th>
              <th className="p-3 text-left">Rodovia</th>
              <th className="p-3 text-left">KM</th>
              <th className="p-3 text-left">Lado</th>
              <th className="p-3 text-left">Dispositivo</th>
              <th className="p-3 text-left">Código</th>
              <th className="p-3 text-left">Situação</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {medicoeEstaticasVerticais.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-muted-foreground">
                  Nenhuma medição encontrada
                </td>
              </tr>
            ) : (
              medicoeEstaticasVerticais.map((medicao: any) => (
                <tr key={medicao.id} className="border-b hover:bg-muted/20">
                  <td className="p-3">{formatDate(medicao.data_medicao)}</td>
                  <td className="p-3">{medicao.lote?.numero || '-'}</td>
                  <td className="p-3">{medicao.rodovia?.codigo || '-'}</td>
                  <td className="p-3">{formatNumber(medicao.km_referencia)}</td>
                  <td className="p-3">{medicao.lado || '-'}</td>
                  <td className="p-3">{medicao.tipo_dispositivo || '-'}</td>
                  <td className="p-3">{medicao.codigo_dispositivo || '-'}</td>
                  <td className="p-3">
                    <Badge variant={medicao.situacao === 'Conforme' ? 'default' : 'destructive'}>
                      {medicao.situacao || '-'}
                    </Badge>
                  </td>
                  <td className="p-3">{renderStatusBadge(medicao.status)}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVisualizarDetalhes(medicao)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {medicao.status === 'pendente_aprovacao_coordenador' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleAbrirDialog(medicao, 'aprovar')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleAbrirDialog(medicao, 'rejeitar')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTabelaDinamicas = () => (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left">Data</th>
              <th className="p-3 text-left">Lote</th>
              <th className="p-3 text-left">Rodovia</th>
              <th className="p-3 text-left">KM Inicial</th>
              <th className="p-3 text-left">KM Final</th>
              <th className="p-3 text-left">Faixa</th>
              <th className="p-3 text-left">Tipo</th>
              <th className="p-3 text-left">Medido</th>
              <th className="p-3 text-left">Mín</th>
              <th className="p-3 text-left">Situação</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {medicoesDinamicas.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-6 text-center text-muted-foreground">
                  Nenhuma medição encontrada
                </td>
              </tr>
            ) : (
              medicoesDinamicas.map((medicao: any) => (
                <tr key={medicao.id} className="border-b hover:bg-muted/20">
                  <td className="p-3">{formatDate(medicao.data_medicao)}</td>
                  <td className="p-3">{medicao.lote?.numero || '-'}</td>
                  <td className="p-3">{medicao.rodovia?.codigo || '-'}</td>
                  <td className="p-3">{formatNumber(medicao.km_inicial)}</td>
                  <td className="p-3">{formatNumber(medicao.km_final)}</td>
                  <td className="p-3">{medicao.faixa || '-'}</td>
                  <td className="p-3">{medicao.tipo_demarcacao || '-'}</td>
                  <td className="p-3 font-semibold">{formatNumber(medicao.valor_medido)}</td>
                  <td className="p-3">{formatNumber(medicao.valor_minimo)}</td>
                  <td className="p-3">
                    <Badge variant={medicao.situacao === 'Conforme' ? 'default' : 'destructive'}>
                      {medicao.situacao || '-'}
                    </Badge>
                  </td>
                  <td className="p-3">{renderStatusBadge(medicao.status)}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVisualizarDetalhes(medicao)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {medicao.status === 'pendente_aprovacao_coordenador' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleAbrirDialog(medicao, 'aprovar')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleAbrirDialog(medicao, 'rejeitar')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (authLoading || !isAdminOrCoordinator) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <header className="bg-primary shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="bg-white/95 rounded-lg px-4 py-2 shadow-md">
              <img
                src={logoOperaVia}
                alt="OperaVia"
                className="h-24 object-contain cursor-pointer hover:scale-105 transition-transform"
                onClick={() => navigate("/")}
              />
            </div>
            <Button
              variant="default"
              size="lg"
              onClick={() => navigateBack(navigate)}
              className="font-semibold shadow-md hover:shadow-lg transition-shadow bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Voltar
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <Card className="shadow-elevated border-2 border-primary/20">
          <CardHeader className="bg-gradient-to-r from-teal-50 to-teal-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl text-teal-900">Validação de Retrorefletividades</CardTitle>
                <CardDescription className="text-lg text-teal-700">
                  Aprovar ou rejeitar medições estáticas e dinâmicas
                </CardDescription>
              </div>
              {contadorPendentes > 0 && (
                <Badge className="bg-teal-500 text-white text-lg px-4 py-2">
                  {contadorPendentes} pendente{contadorPendentes !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-4">
              <Label htmlFor="status-filtro">Filtrar por status:</Label>
              <Select value={statusFiltro} onValueChange={(value) => setStatusFiltro(value as StatusFiltro)}>
                <SelectTrigger id="status-filtro" className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente_aprovacao_coordenador">Pendentes</SelectItem>
                  <SelectItem value="aprovado">Aprovadas</SelectItem>
                  <SelectItem value="rejeitado">Rejeitadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs defaultValue="estatica-horizontal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="estatica-horizontal">
                  Estática Horizontal
                  {medicoeEstaticasHorizontais.filter((m: any) => m.status === 'pendente_aprovacao_coordenador').length > 0 && (
                    <Badge className="ml-2 bg-yellow-500 text-white">
                      {medicoeEstaticasHorizontais.filter((m: any) => m.status === 'pendente_aprovacao_coordenador').length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="estatica-vertical">
                  Estática Vertical
                  {medicoeEstaticasVerticais.filter((m: any) => m.status === 'pendente_aprovacao_coordenador').length > 0 && (
                    <Badge className="ml-2 bg-yellow-500 text-white">
                      {medicoeEstaticasVerticais.filter((m: any) => m.status === 'pendente_aprovacao_coordenador').length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="dinamica">
                  Dinâmica
                  {medicoesDinamicas.filter((m: any) => m.status === 'pendente_aprovacao_coordenador').length > 0 && (
                    <Badge className="ml-2 bg-yellow-500 text-white">
                      {medicoesDinamicas.filter((m: any) => m.status === 'pendente_aprovacao_coordenador').length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="estatica-horizontal" className="mt-4">
                {renderTabelaEstaticasHorizontais()}
              </TabsContent>

              <TabsContent value="estatica-vertical" className="mt-4">
                {renderTabelaEstaticasVerticais()}
              </TabsContent>

              <TabsContent value="dinamica" className="mt-4">
                {renderTabelaDinamicas()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      {/* Dialog de aprovação/rejeição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {acaoAtual === 'aprovar' ? 'Aprovar Medição' : 'Rejeitar Medição'}
            </DialogTitle>
            <DialogDescription>
              {acaoAtual === 'aprovar' 
                ? 'Confirme a aprovação desta medição.' 
                : 'Informe o motivo da rejeição (obrigatório).'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="observacao">
                Observação {acaoAtual === 'rejeitar' && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="observacao"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder={acaoAtual === 'aprovar' ? 'Observação opcional...' : 'Motivo da rejeição...'}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant={acaoAtual === 'aprovar' ? 'default' : 'destructive'}
              onClick={handleConfirmarAcao}
            >
              {acaoAtual === 'aprovar' ? 'Aprovar' : 'Rejeitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de detalhes */}
      <Dialog open={dialogDetalhesOpen} onOpenChange={setDialogDetalhesOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Medição</DialogTitle>
          </DialogHeader>

          {medicaoSelecionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Data</Label>
                  <p className="font-medium">{formatDate(medicaoSelecionada.data_medicao)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Lote</Label>
                  <p className="font-medium">{medicaoSelecionada.lote?.numero || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Rodovia</Label>
                  <p className="font-medium">{medicaoSelecionada.rodovia?.codigo || '-'}</p>
                </div>
                {medicaoSelecionada.tipo_sinalizacao && (
                  <>
                    <div>
                      <Label className="text-muted-foreground">Tipo</Label>
                      <p className="font-medium">{medicaoSelecionada.tipo_sinalizacao}</p>
                    </div>
                    {medicaoSelecionada.tipo_sinalizacao === 'Horizontal' ? (
                      <>
                        <div>
                          <Label className="text-muted-foreground">Posição</Label>
                          <p className="font-medium">{medicaoSelecionada.posicao_horizontal || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Cor</Label>
                          <p className="font-medium">{medicaoSelecionada.cor_horizontal || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Média</Label>
                          <p className="font-medium">{formatNumber(medicaoSelecionada.valor_medido_horizontal)}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Valor Mínimo</Label>
                          <p className="font-medium">{formatNumber(medicaoSelecionada.valor_minimo_horizontal)}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <Label className="text-muted-foreground">Dispositivo</Label>
                          <p className="font-medium">{medicaoSelecionada.tipo_dispositivo || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Código</Label>
                          <p className="font-medium">{medicaoSelecionada.codigo_dispositivo || '-'}</p>
                        </div>
                      </>
                    )}
                  </>
                )}
                {medicaoSelecionada.faixa && (
                  <>
                    <div>
                      <Label className="text-muted-foreground">Faixa</Label>
                      <p className="font-medium">{medicaoSelecionada.faixa}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Tipo Demarcação</Label>
                      <p className="font-medium">{medicaoSelecionada.tipo_demarcacao || '-'}</p>
                    </div>
                  </>
                )}
              </div>

              {medicaoSelecionada.observacao && (
                <div>
                  <Label className="text-muted-foreground">Observação do Técnico</Label>
                  <p className="text-sm mt-1">{medicaoSelecionada.observacao}</p>
                </div>
              )}

              {medicaoSelecionada.observacao_coordenador && (
                <div>
                  <Label className="text-muted-foreground">Observação do Coordenador</Label>
                  <p className="text-sm mt-1">{medicaoSelecionada.observacao_coordenador}</p>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">{renderStatusBadge(medicaoSelecionada.status)}</div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogDetalhesOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
