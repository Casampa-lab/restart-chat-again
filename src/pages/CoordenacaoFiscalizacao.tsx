import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { useWorkSession } from "@/hooks/useWorkSession";
import { supabase } from "@/integrations/supabase/client";
import { getConfig, type GrupoElemento } from "@/lib/reconciliacaoConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, ClipboardCheck, GitCompareArrows, CheckSquare, Eye, FileText, FileSearch, Activity, History as HistoryIcon, XCircle } from "lucide-react";
import { BarChart3, FileSpreadsheet } from "lucide-react";
import FrenteLiberadaForm from "@/components/FrenteLiberadaForm";
import { exportFrentesLiberadas, exportNaoConformidades, exportRetrorrefletividadeEstaticaHorizontal, exportRetrorrefletividadeEstaticaVertical, exportRetrorrefletividadeDinamica, exportDefensas, exportIntervencoesSH, exportIntervencoesInscricoes, exportIntervencoesSV, exportIntervencoesTacha, exportFichasVerificacao, exportFichasPlaca, exportRegistroNC } from "@/lib/excelExport";
import { toast } from "sonner";
import logoOperaVia from "@/assets/logo-operavia-optimized.webp";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
const CoordenacaoFiscalizacao = () => {
  const navigate = useNavigate();
  const { navigateBack } = useNavigationContext();
  const {
    user,
    loading: authLoading
  } = useAuth();
  const { activeSession } = useWorkSession(user?.id);
  const [isAdminOrCoordinator, setIsAdminOrCoordinator] = useState(false);

  // Contador de elementos não cadastrados pendentes de aprovação
  const {
    data: contadorElementosPendentes = 0
  } = useQuery({
    queryKey: ["contador-elementos-pendentes"],
    queryFn: async () => {
      const {
        count
      } = await supabase.from("elementos_pendentes_aprovacao").select("*", {
        count: "exact",
        head: true
      }).eq("status", "pendente_aprovacao");
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000
  });

  // Contador de divergências pendentes de reconciliação (filtrado por sessão ativa)
  const {
    data: countDivergencias = 0
  } = useQuery({
    queryKey: ["count-divergencias-coordenacao", activeSession?.lote_id, activeSession?.rodovia_id],
    queryFn: async () => {
      if (!activeSession) return 0;
      
      // Usar grupos lógicos padronizados (mesma lógica de ReconciliacaoUniversal)
      const gruposElementos: GrupoElemento[] = ['placas', 'defensas', 'porticos', 'marcas_longitudinais', 'inscricoes', 'cilindros', 'tachas'];
      let totalDivergencias = 0;
      
      for (const grupo of gruposElementos) {
        const config = getConfig(grupo);
        const {
          count
        } = await supabase
          .from(config.tabelaNecessidades as any)
          .select(`
            id,
            reconciliacao:reconciliacoes!inner(status)
          `, {
            count: "exact",
            head: true
          })
          .eq("divergencia", true)
          .eq("reconciliacao.status", "pendente_aprovacao")
          .eq("lote_id", activeSession.lote_id)
          .eq("rodovia_id", activeSession.rodovia_id);
        totalDivergencias += count || 0;
      }
      return totalDivergencias;
    },
    enabled: !!user && !!activeSession,
    refetchInterval: 30000,
    staleTime: 0,
    gcTime: 0
  });

  // Contador de intervenções pendentes de aprovação
  const {
    data: countIntervencoesPendentes = 0
  } = useQuery({
    queryKey: ["count-intervencoes-aprovacao"],
    queryFn: async () => {
      const tabelas = ['ficha_marcas_longitudinais_intervencoes', 'ficha_cilindros_intervencoes', 'ficha_porticos_intervencoes', 'defensas_intervencoes', 'ficha_inscricoes_intervencoes', 'ficha_tachas_intervencoes', 'ficha_placa_intervencoes'];
      let totalPendentes = 0;
      for (const tabela of tabelas) {
        const {
          count
        } = await supabase.from(tabela as any).select("*", {
          count: "exact",
          head: true
        }).eq("pendente_aprovacao_coordenador", true);
        totalPendentes += count || 0;
      }
      return totalPendentes;
    },
    enabled: !!user,
    refetchInterval: 30000
  });

  // Contador de fichas de verificação pendentes de aprovação
  const {
    data: countFichasVerificacaoPendentes = 0
  } = useQuery({
    queryKey: ["count-fichas-verificacao-pendentes"],
    queryFn: async () => {
      const { count } = await supabase
        .from('ficha_verificacao')
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente_aprovacao_coordenador");
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000
  });

  // Contador de NCs pendentes de validação
  const {
    data: countNCsPendentes = 0
  } = useQuery({
    queryKey: ["count-ncs-pendentes"],
    queryFn: async () => {
      const { count } = await supabase
        .from('nao_conformidades')
        .select("*", { count: "exact", head: true })
        .eq("deleted", false)
        .eq("enviado_coordenador", true)
        .is("data_notificacao", null);
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000
  });

  // Contador de retrorefletividades pendentes
  const {
    data: countRetrorrefletividadesPendentes = 0
  } = useQuery({
    queryKey: ["count-retrorrefletividades-pendentes"],
    queryFn: async () => {
      const [estaticasRes, dinamicasRes] = await Promise.all([
        supabase.from('retrorrefletividade_estatica')
          .select("*", { count: "exact", head: true })
          .eq("status", "pendente_aprovacao_coordenador"),
        supabase.from('retrorrefletividade_dinamica')
          .select("*", { count: "exact", head: true })
          .eq("status", "pendente_aprovacao_coordenador")
      ]);
      return (estaticasRes.count || 0) + (dinamicasRes.count || 0);
    },
    enabled: !!user,
    refetchInterval: 30000
  });
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Proteção: redirecionar usuários mobile para /modo-campo
  useEffect(() => {
    const modoAcesso = localStorage.getItem('modoAcesso');
    if (modoAcesso === 'campo') {
      toast.error('Esta função não está disponível no modo campo');
      navigate('/modo-campo');
    }
  }, [navigate]);
  useEffect(() => {
    const checkAdminOrCoordinator = async () => {
      if (!user) return;
      const {
        data
      } = await supabase.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin", "coordenador"]).maybeSingle();
      setIsAdminOrCoordinator(!!data);
    };
    checkAdminOrCoordinator();
  }, [user]);
  const handleDownload = async (type: string) => {
    try {
      switch (type) {
        case 'frentes':
          await exportFrentesLiberadas();
          toast.success('Planilha de Frentes Liberadas baixada com sucesso!');
          break;
        case 'ncs':
          await exportNaoConformidades();
          toast.success('Planilha de NCs baixada com sucesso!');
          break;
        case 'retro-estatica-horizontal':
          await exportRetrorrefletividadeEstaticaHorizontal();
          toast.success('Planilha de Retrorrefletividade Horizontal baixada com sucesso!');
          break;
        case 'retro-estatica-vertical':
          await exportRetrorrefletividadeEstaticaVertical();
          toast.success('Planilha de Retrorrefletividade Vertical baixada com sucesso!');
          break;
        case 'retro-dinamica':
          await exportRetrorrefletividadeDinamica();
          toast.success('Planilha de Retrorrefletividade Dinâmica baixada com sucesso!');
          break;
        case 'defensas':
          await exportDefensas();
          toast.success('Planilha de Defensas baixada com sucesso!');
          break;
        case 'int-sh':
          await exportIntervencoesSH();
          toast.success('Planilha de Intervenções SH baixada com sucesso!');
          break;
        case 'int-inscricoes':
          await exportIntervencoesInscricoes();
          toast.success('Planilha de Intervenções Inscrições baixada com sucesso!');
          break;
        case 'int-sv':
          await exportIntervencoesSV();
          toast.success('Planilha de Intervenções SV baixada com sucesso!');
          break;
        case 'int-tacha':
          await exportIntervencoesTacha();
          toast.success('Planilha de Intervenções Tachas baixada com sucesso!');
          break;
        case 'fichas-verificacao':
          await exportFichasVerificacao();
          toast.success('Planilha de Fichas de Verificação baixada com sucesso!');
          break;
        case 'fichas-placa':
          await exportFichasPlaca();
          toast.success('Planilha de Fichas de Placa baixada com sucesso!');
          break;
        case 'registro-nc':
          await exportRegistroNC();
          toast.success('Planilha de Registro NC baixada com sucesso!');
          break;
      }
    } catch (error) {
      console.error('Erro ao baixar planilha:', error);
      toast.error('Erro ao baixar planilha. Tente novamente.');
    }
  };
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <header className="bg-primary shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="bg-white/95 rounded-lg px-4 py-2 shadow-md">
              <img src={logoOperaVia} alt="OperaVia" className="h-24 object-contain cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate("/")} />
            </div>
            <Button variant="default" size="lg" onClick={() => navigateBack(navigate)} className="font-semibold shadow-md hover:shadow-lg transition-shadow bg-accent text-accent-foreground hover:bg-accent/90">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Voltar
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <Card className="shadow-elevated border-2 border-primary/20">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardTitle className="text-3xl text-primary">Gestão</CardTitle>
            <CardDescription className="text-lg">
              Acesse todas as listagens e registros do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {isAdminOrCoordinator && <div className="mb-6 space-y-4">
                {/* Card Elementos Pendentes */}
                <Card className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileSpreadsheet className="h-6 w-6 text-red-600" />
                          <h3 className="text-xl font-bold text-red-900">Elementos Não Cadastrados em Projeto</h3>
                        </div>
                        <p className="text-sm text-red-700">Aprove ou rejeite elementos identificados pelos técnicos em campo que não constam no projeto</p>
                        {contadorElementosPendentes > 0 && <div className="mt-3 flex items-center gap-2">
                            <Badge className="bg-red-500 text-white text-base px-3 py-1">
                              {contadorElementosPendentes} {contadorElementosPendentes === 1 ? 'elemento pendente' : 'elementos pendentes'}
                            </Badge>
                          </div>}
                      </div>
                      <Button size="lg" variant="default" className="font-semibold text-base px-6 py-6 shadow-md hover:shadow-lg transition-all bg-red-600 hover:bg-red-700 text-white" onClick={() => navigate("/elementos-pendentes")}>
                        <FileSpreadsheet className="mr-2 h-5 w-5" />
                        Acessar Aprovação
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Aprovar Intervenções no Inventário */}
                <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckSquare className="h-6 w-6 text-blue-600" />
                          <h3 className="text-xl font-bold text-blue-900">Aprovar Intervenções no Inventário</h3>
                        </div>
                        <p className="text-sm text-blue-700">
                          Aprove intervenções registradas pelos técnicos e marque serviços fora do plano (7 tipos de elementos)
                        </p>
                        {countIntervencoesPendentes > 0 && <div className="mt-3 flex items-center gap-2">
                            <Badge className="bg-blue-500 text-white text-base px-3 py-1">
                              {countIntervencoesPendentes} {countIntervencoesPendentes === 1 ? 'intervenção pendente' : 'intervenções pendentes'}
                            </Badge>
                          </div>}
                      </div>
                      <Button size="lg" variant="default" className="font-semibold text-base px-6 py-6 shadow-md hover:shadow-lg transition-all bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate("/revisao-intervencoes")}>
                        <CheckSquare className="mr-2 h-5 w-5" />
                        Acessar Aprovação
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Botão Reconciliação */}
                <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <GitCompareArrows className="h-6 w-6 text-orange-600" />
                          <h3 className="text-xl font-bold text-orange-900">Sistema de Reconciliação</h3>
                        </div>
                        <p className="text-sm text-orange-700">
                          Resolva divergências entre o projeto e a análise automática GPS para todos os grupos de elementos
                        </p>
                        {countDivergencias > 0 && <div className="mt-3 flex items-center gap-2">
                            <Badge className="bg-orange-500 text-white text-base px-3 py-1">
                              {countDivergencias} {countDivergencias === 1 ? 'divergência pendente' : 'divergências pendentes'}
                            </Badge>
                          </div>}
                      </div>
                      <Button size="lg" variant="default" className="font-semibold text-base px-6 py-6 shadow-md hover:shadow-lg transition-all bg-orange-600 hover:bg-orange-700 text-white" onClick={() => navigate("/reconciliacao-pendente", {
                    state: {
                      from: "/coordenacao-fiscalizacao"
                    }
                  })}>

                        <GitCompareArrows className="mr-2 h-5 w-5" />
                        Acessar Reconciliação
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Validação de Fichas de Verificação */}
                <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-300 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <ClipboardCheck className="h-6 w-6 text-purple-600" />
                          <h3 className="text-xl font-bold text-purple-900">Validação de Fichas de Verificação</h3>
                        </div>
                        <p className="text-sm text-purple-700">
                          Aprovar ou rejeitar fichas SH enviadas pelos técnicos de campo com todas as leituras de retrorefletividade
                        </p>
                        {countFichasVerificacaoPendentes > 0 && <div className="mt-3 flex items-center gap-2">
                            <Badge className="bg-purple-500 text-white text-base px-3 py-1">
                              {countFichasVerificacaoPendentes} {countFichasVerificacaoPendentes === 1 ? 'ficha pendente' : 'fichas pendentes'}
                            </Badge>
                          </div>}
                      </div>
                      <Button size="lg" variant="default" className="font-semibold text-base px-6 py-6 shadow-md hover:shadow-lg transition-all bg-purple-600 hover:bg-purple-700 text-white" onClick={() => navigate("/validacao-fichas-verificacao")}>
                        <ClipboardCheck className="mr-2 h-5 w-5" />
                        Acessar Validação
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Validação de Retrorefletividades */}
                <Card className="bg-gradient-to-r from-teal-50 to-teal-100 border-2 border-teal-300 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="h-6 w-6 text-teal-600" />
                          <h3 className="text-xl font-bold text-teal-900">Validação de Retrorefletividades</h3>
                        </div>
                        <p className="text-sm text-teal-700">
                          Aprovar medições estáticas e dinâmicas antes de gerar relatórios
                        </p>
                        {countRetrorrefletividadesPendentes > 0 && (
                          <div className="mt-3 flex items-center gap-2">
                            <Badge className="bg-teal-500 text-white text-base px-3 py-1">
                              {countRetrorrefletividadesPendentes} {countRetrorrefletividadesPendentes === 1 ? 'medição pendente' : 'medições pendentes'}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <Button
                        size="lg"
                        variant="default"
                        className="font-semibold text-base px-6 py-6 shadow-md hover:shadow-lg transition-all bg-teal-600 hover:bg-teal-700 text-white"
                        onClick={() => navigate("/validacao-retrorrefletividades")}
                      >
                        <Activity className="mr-2 h-5 w-5" />
                        Acessar Validação
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Validação de Não Conformidades */}
                <Card className="bg-gradient-to-r from-pink-50 to-pink-100 border-2 border-pink-300 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <XCircle className="h-6 w-6 text-pink-600" />
                          <h3 className="text-xl font-bold text-pink-900">Validação de Não Conformidades</h3>
                        </div>
                        <p className="text-sm text-pink-700">
                          Aprovar, rejeitar ou notificar NCs enviadas pelos técnicos de campo
                        </p>
                        {countNCsPendentes > 0 && <div className="mt-3 flex items-center gap-2">
                            <Badge className="bg-pink-500 text-white text-base px-3 py-1">
                              {countNCsPendentes} {countNCsPendentes === 1 ? 'NC pendente' : 'NCs pendentes'}
                            </Badge>
                          </div>}
                      </div>
                      <Button size="lg" variant="default" className="font-semibold text-base px-6 py-6 shadow-md hover:shadow-lg transition-all bg-pink-600 hover:bg-pink-700 text-white" onClick={() => navigate("/ncs-coordenador")}>
                        <XCircle className="mr-2 h-5 w-5" />
                        Acessar Validação
                      </Button>
                    </div>
                  </CardContent>
                </Card>
            </div>}
            
            {/* Seção VABLE - Rastreabilidade */}
            <Card className="mb-6 border-2 border-primary/30 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Activity className="h-6 w-6 text-primary" />
                  VABLE - Sistema de Rastreabilidade
                </CardTitle>
                <CardDescription className="text-base">
                  Controle de intervenções conforme IN 3/2025 do DNIT
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Card 1: Documentação */}
                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 hover:bg-primary/5 transition-all"
                    onClick={() => navigate('/documentacao-vable')}
                  >
                    <FileSearch className="h-8 w-8 mb-2 text-primary" />
                    <h3 className="font-semibold text-left">Documentação VABLE</h3>
                    <p className="text-xs text-muted-foreground text-left mt-1">
                      Entenda o sistema de rastreabilidade
                    </p>
                  </Button>

                  {/* Card 2: Auditoria */}
                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 hover:bg-primary/5 transition-all"
                    onClick={() => navigate('/auditoria-inventario')}
                  >
                    <HistoryIcon className="h-8 w-8 mb-2 text-primary" />
                    <h3 className="font-semibold text-left">Auditoria de Inventário</h3>
                    <p className="text-xs text-muted-foreground text-left mt-1">
                      🟢🟡⚪ Histórico completo de alterações
                    </p>
                  </Button>

                  {/* Card 3: Inventário Dinâmico */}
                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 hover:bg-primary/5 transition-all"
                    onClick={() => navigate('/baseline-evolucao')}
                  >
                    <Activity className="h-8 w-8 mb-2 text-primary" />
                    <h3 className="font-semibold text-left">Inventário Dinâmico</h3>
                    <p className="text-xs text-muted-foreground text-left mt-1">
                      Comparação Baseline × Estado Atual
                    </p>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="frentes" className="w-full">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 gap-2 h-auto bg-muted p-2">
                <TabsTrigger value="frentes" className="whitespace-normal py-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold text-sm">
                  Frentes Liberadas
                </TabsTrigger>
                <TabsTrigger value="ncs-lote" className="whitespace-normal py-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold text-sm">
                  NCs
                </TabsTrigger>
                <TabsTrigger value="retrorrefletividades" className="whitespace-normal py-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold text-sm">
                  Retrorrefletividades
                </TabsTrigger>
                <TabsTrigger value="defensas" className="whitespace-normal py-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold text-sm">
                  Defensas
                </TabsTrigger>
                <TabsTrigger value="intervencoes" className="whitespace-normal py-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold text-sm">
                  Intervenções
                </TabsTrigger>
                <TabsTrigger value="fichas" className="whitespace-normal py-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold text-sm">
                  Fichas
                </TabsTrigger>
                <TabsTrigger value="programa-ssv" className="whitespace-normal py-4 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-md font-semibold text-sm">
                  Programa SSV
                </TabsTrigger>
              </TabsList>

              <TabsContent value="frentes" className="mt-6">
                <div className="space-y-6">
                  {/* Seção de Registro */}
                  <Card className="border-2 border-primary/20">
                    <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Registrar Nova Frente Liberada
                      </CardTitle>
                      <CardDescription>
                        Planilha 2.2 - Registre as frentes de trabalho liberadas para execução dos serviços
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <FrenteLiberadaForm 
                        loteId={activeSession?.lote_id || ''} 
                        rodoviaId={activeSession?.rodovia_id || ''} 
                      />
                    </CardContent>
                  </Card>

                  {/* Seção de Visualização/Exportação */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Visualizar e Exportar Frentes
                      </CardTitle>
                      <CardDescription>
                        Acesse os registros existentes ou baixe a planilha consolidada
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4 justify-center">
                        <Button 
                          size="lg" 
                          variant="default" 
                          className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow" 
                          onClick={() => navigate("/minhas-frentes-liberadas")}
                        >
                          <Eye className="mr-2 h-5 w-5" />
                          Visualizar Registros
                        </Button>
                        <Button 
                          size="lg" 
                          variant="secondary" 
                          className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow" 
                          onClick={() => handleDownload('frentes')}
                        >
                          <Download className="mr-2 h-5 w-5" />
                          Baixar Planilha
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="ncs-lote" className="mt-6">
                <div className="text-center py-8 space-y-4">
                  <Button size="lg" variant="default" className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow" onClick={() => navigate("/ncs-coordenador")}>
                    Acessar NCs por Lote
                  </Button>
                  <Button size="lg" variant="secondary" className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow ml-4" onClick={() => handleDownload('ncs')}>
                    <Download className="mr-2 h-5 w-5" />
                    Baixar Planilha
                  </Button>
                  <p className="text-muted-foreground mt-4">
                    Visualize e gerencie todas as não conformidades organizadas por lote
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="retrorrefletividades" className="mt-6">
                <div className="text-center py-8 space-y-4">
                  <div className="space-x-4">
                    <Button size="lg" variant="default" className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow" onClick={() => navigate("/minhas-retrorrefletividades")}>
                      Estática
                    </Button>
                    <Button size="lg" variant="default" className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow" onClick={() => navigate("/minhas-retrorrefletividades-dinamicas")}>
                      Dinâmica
                    </Button>
                  </div>
                  <Button size="lg" variant="secondary" className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow" onClick={async () => {
                  await handleDownload('retro-estatica-horizontal');
                  await handleDownload('retro-estatica-vertical');
                  await handleDownload('retro-dinamica');
                }}>
                    <Download className="mr-2 h-5 w-5" />
                    Baixar Planilhas
                  </Button>
                  <p className="text-muted-foreground mt-4">
                    Visualize e baixe os dados de retrorrefletividade estática e dinâmica
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="defensas" className="mt-6">
                <div className="text-center py-8 space-y-4">
                  <Button size="lg" variant="default" className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow" onClick={() => navigate("/minhas-defensas")}>
                    Visualizar Defensas
                  </Button>
                  <Button size="lg" variant="secondary" className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow ml-4" onClick={() => handleDownload('defensas')}>
                    <Download className="mr-2 h-5 w-5" />
                    Baixar Planilha
                  </Button>
                  <p className="text-muted-foreground mt-4">
                    Visualize e baixe os dados de inspeção de defensas
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="intervencoes" className="mt-6">
                <div className="text-center py-8 space-y-4">
                  <div className="space-x-4 mb-4">
                    <Button size="lg" variant="default" className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow" onClick={() => navigate("/minhas-intervencoes-sh")}>
                      SH
                    </Button>
                    <Button size="lg" variant="default" className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow" onClick={() => navigate("/minhas-intervencoes-inscricoes")}>
                      Inscrições
                    </Button>
                    <Button size="lg" variant="default" className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow" onClick={() => navigate("/minhas-intervencoes-sv")}>
                      SV
                    </Button>
                    <Button size="lg" variant="default" className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow" onClick={() => navigate("/minhas-intervencoes-tacha")}>
                      Tachas
                    </Button>
                  </div>
                  <Button size="lg" variant="secondary" className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow" onClick={async () => {
                  await handleDownload('int-sh');
                  await handleDownload('int-inscricoes');
                  await handleDownload('int-sv');
                  await handleDownload('int-tacha');
                }}>
                    <Download className="mr-2 h-5 w-5" />
                    Baixar Planilhas
                  </Button>
                  <p className="text-muted-foreground mt-4">
                    Visualize e baixe os dados de intervenções em sinalização
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="fichas" className="mt-6">
                <div className="text-center py-8 space-y-4">
                  <div className="space-x-4 mb-4">
                    <Button size="lg" variant="default" className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow" onClick={() => navigate("/minhas-fichas-verificacao")}>
                      Verificação
                    </Button>
                    <Button size="lg" variant="default" className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow" onClick={() => navigate("/minhas-fichas-placa")}>
                      Placa
                    </Button>
                    <Button size="lg" variant="default" className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow" onClick={() => navigate("/meus-registros-nc")}>
                      Registro NC
                    </Button>
                  </div>
                  <Button size="lg" variant="secondary" className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow" onClick={async () => {
                  await handleDownload('fichas-verificacao');
                  await handleDownload('fichas-placa');
                  await handleDownload('registro-nc');
                }}>
                    <Download className="mr-2 h-5 w-5" />
                    Baixar Planilhas
                  </Button>
                  <p className="text-muted-foreground mt-4">
                    Visualize e baixe as fichas de verificação e cadastro
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="programa-ssv" className="mt-6">
                <div className="text-center py-8 space-y-4">
                  <h3 className="text-lg font-semibold">Programa de Sinalização e Segurança Viária</h3>
                  <p className="text-muted-foreground mb-6">
                    Ferramentas de análise e geração de relatórios do programa
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button size="lg" variant="default" className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow" onClick={() => navigate("/dashboard-necessidades")}>
                      <BarChart3 className="mr-2 h-5 w-5" />
                      Dashboard
                    </Button>
                    <Button size="lg" variant="secondary" className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow" onClick={() => navigate("/minhas-necessidades-relatorios")}>
                      <FileSpreadsheet className="mr-2 h-5 w-5" />
                      Relatórios
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <footer className="bg-background border-t mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-center gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Críticas e sugestões: <a href="mailto:contato@operavia.online" className="text-primary hover:underline">contato@operavia.online</a>
            </p>
          </div>
        </div>
      </footer>
    </div>;
};
export default CoordenacaoFiscalizacao;