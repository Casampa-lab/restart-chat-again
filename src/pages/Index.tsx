import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkSession } from "@/hooks/useWorkSession";
import { useSupervisora } from "@/hooks/useSupervisora";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getConfig, type GrupoElemento } from "@/lib/reconciliacaoConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LogOut, MapPin, Briefcase, Settings, ClipboardList, ArrowLeftRight, Boxes, Copy, X, FileText, FileSearch, History as HistoryIcon, Activity } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import SessionSelector from "@/components/SessionSelector";

import DefensasForm from "@/components/DefensasForm";
import { FichaPlacaForm } from "@/components/FichaPlacaForm";
import { InventarioPlacasViewer } from "@/components/InventarioPlacasViewer";
import { InventarioMarcasLongitudinaisViewer } from "@/components/InventarioMarcasLongitudinaisViewer";
import { InventarioCilindrosViewer } from "@/components/InventarioCilindrosViewer";
import { InventarioPorticosViewer } from "@/components/InventarioPorticosViewer";
import { InventarioInscricoesViewer } from "@/components/InventarioInscricoesViewer";
import { InventarioTachasViewer } from "@/components/InventarioTachasViewer";
import { InventarioDefensasViewer } from "@/components/InventarioDefensasViewer";
import { toast } from "sonner";
import logoOperaVia from "@/assets/logo-operavia-optimized.webp";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import IntervencoesSHForm from "@/components/IntervencoesSHForm";
import { useIOSDetection } from "@/hooks/useIOSDetection";
import { IntervencoesSVForm } from "@/components/IntervencoesSVForm";
import IntervencoesInscricoesForm from "@/components/IntervencoesInscricoesForm";
import { IntervencoesTachaForm } from "@/components/IntervencoesTachaForm";
import { IntervencoesCilindrosForm } from "@/components/IntervencoesCilindrosForm";
import { IntervencoesPorticosForm } from "@/components/IntervencoesPorticosForm";
import DefensasIntervencoesForm from "@/components/DefensasIntervencoesForm";
import { useMarcoZeroRecente } from "@/hooks/useMarcoZeroRecente";
import { ConsolidatedInventoryBadge } from "@/components/ConsolidatedInventoryBadge";
const Index = () => {
  const navigate = useNavigate();
  const { isModernIOS } = useIOSDetection();
  const {
    user,
    loading: authLoading,
    signOut
  } = useAuth();
  const {
    activeSession,
    loading: sessionLoading,
    refreshSession,
    endSession
  } = useWorkSession(user?.id);
  const {
    data: supervisora
  } = useSupervisora();
  const [isAdminOrCoordinator, setIsAdminOrCoordinator] = useState(false);
  const [showVableCard, setShowVableCard] = useState(() => {
    const vableHidden = sessionStorage.getItem('vableCardHidden');
    return vableHidden !== 'true';
  });
  const [inventarioShSubTab, setInventarioShSubTab] = useState("longitudinais");
  const [inventarioSvSubTab, setInventarioSvSubTab] = useState("placas");
  const [showInviteCode, setShowInviteCode] = useState(() => {
    return localStorage.getItem('hideInviteCode') !== 'true';
  });

  // Estados para controle de diálogo de intervenção
  const [intervencaoDialogOpen, setIntervencaoDialogOpen] = useState(false);
  const [elementoParaIntervencao, setElementoParaIntervencao] = useState<any>(null);
  const [tipoIntervencao, setTipoIntervencao] = useState<
    "marcas_longitudinais" | "placas" | "tachas" | "cilindros" | 
    "porticos" | "inscricoes" | "defensas" | null
  >(null);

  // Queries para contar registros de inventário (CADASTRO)
  const { data: countMarcasLong } = useQuery({
    queryKey: ["count-marcas-long", activeSession?.lote_id, activeSession?.rodovia_id],
    queryFn: async () => {
      const { count } = await supabase
        .from("ficha_marcas_longitudinais")
        .select("*", { count: "exact", head: true })
        .eq("lote_id", activeSession!.lote_id)
        .eq("rodovia_id", activeSession!.rodovia_id);
      return count || 0;
    },
    enabled: !!activeSession,
  });

  // Queries para contar registros de NECESSIDADES
  const { data: countNecMarcasLong } = useQuery({
    queryKey: ["count-nec-marcas-long", activeSession?.lote_id, activeSession?.rodovia_id],
    queryFn: async () => {
      const { count } = await supabase
        .from("necessidades_marcas_longitudinais")
        .select("*", { count: "exact", head: true })
        .eq("lote_id", activeSession!.lote_id)
        .eq("rodovia_id", activeSession!.rodovia_id);
      return count || 0;
    },
    enabled: !!activeSession,
  });

  const { data: countCilindros } = useQuery({
    queryKey: ["count-cilindros", activeSession?.lote_id, activeSession?.rodovia_id],
    queryFn: async () => {
      const { count } = await supabase
        .from("ficha_cilindros")
        .select("*", { count: "exact", head: true })
        .eq("lote_id", activeSession!.lote_id)
        .eq("rodovia_id", activeSession!.rodovia_id);
      return count || 0;
    },
    enabled: !!activeSession,
  });

  const { data: countNecCilindros } = useQuery({
    queryKey: ["count-nec-cilindros", activeSession?.lote_id, activeSession?.rodovia_id],
    queryFn: async () => {
      const { count } = await supabase
        .from("necessidades_cilindros")
        .select("*", { count: "exact", head: true })
        .eq("lote_id", activeSession!.lote_id)
        .eq("rodovia_id", activeSession!.rodovia_id);
      return count || 0;
    },
    enabled: !!activeSession,
  });

  const { data: countInscricoes } = useQuery({
    queryKey: ["count-inscricoes", activeSession?.lote_id, activeSession?.rodovia_id],
    queryFn: async () => {
      const { count } = await supabase
        .from("ficha_inscricoes")
        .select("*", { count: "exact", head: true })
        .eq("lote_id", activeSession!.lote_id)
        .eq("rodovia_id", activeSession!.rodovia_id);
      return count || 0;
    },
    enabled: !!activeSession,
  });

  const { data: countNecInscricoes } = useQuery({
    queryKey: ["count-nec-inscricoes", activeSession?.lote_id, activeSession?.rodovia_id],
    queryFn: async () => {
      const { count } = await supabase
        .from("necessidades_marcas_transversais")
        .select("*", { count: "exact", head: true })
        .eq("lote_id", activeSession!.lote_id)
        .eq("rodovia_id", activeSession!.rodovia_id);
      return count || 0;
    },
    enabled: !!activeSession,
  });

  const { data: countTachas } = useQuery({
    queryKey: ["count-tachas", activeSession?.lote_id, activeSession?.rodovia_id],
    queryFn: async () => {
      const { count } = await supabase
        .from("ficha_tachas")
        .select("*", { count: "exact", head: true })
        .eq("lote_id", activeSession!.lote_id)
        .eq("rodovia_id", activeSession!.rodovia_id);
      return count || 0;
    },
    enabled: !!activeSession,
  });

  const { data: countNecTachas } = useQuery({
    queryKey: ["count-nec-tachas", activeSession?.lote_id, activeSession?.rodovia_id],
    queryFn: async () => {
      const { count } = await supabase
        .from("necessidades_tachas")
        .select("*", { count: "exact", head: true })
        .eq("lote_id", activeSession!.lote_id)
        .eq("rodovia_id", activeSession!.rodovia_id);
      return count || 0;
    },
    enabled: !!activeSession,
  });

  const { data: countPlacas } = useQuery({
    queryKey: ["count-placas", activeSession?.lote_id, activeSession?.rodovia_id],
    queryFn: async () => {
      const { count } = await supabase
        .from("ficha_placa")
        .select("*", { count: "exact", head: true })
        .eq("lote_id", activeSession!.lote_id)
        .eq("rodovia_id", activeSession!.rodovia_id);
      return count || 0;
    },
    enabled: !!activeSession,
  });

  const { data: countNecPlacas } = useQuery({
    queryKey: ["count-nec-placas", activeSession?.lote_id, activeSession?.rodovia_id],
    queryFn: async () => {
      const { count } = await supabase
        .from("necessidades_placas")
        .select("*", { count: "exact", head: true })
        .eq("lote_id", activeSession!.lote_id)
        .eq("rodovia_id", activeSession!.rodovia_id);
      return count || 0;
    },
    enabled: !!activeSession,
  });

  const { data: countPorticos } = useQuery({
    queryKey: ["count-porticos", activeSession?.lote_id, activeSession?.rodovia_id],
    queryFn: async () => {
      const { count } = await supabase
        .from("ficha_porticos")
        .select("*", { count: "exact", head: true })
        .eq("lote_id", activeSession!.lote_id)
        .eq("rodovia_id", activeSession!.rodovia_id);
      return count || 0;
    },
    enabled: !!activeSession,
  });

  const { data: countNecPorticos } = useQuery({
    queryKey: ["count-nec-porticos", activeSession?.lote_id, activeSession?.rodovia_id],
    queryFn: async () => {
      const { count } = await supabase
        .from("necessidades_porticos")
        .select("*", { count: "exact", head: true })
        .eq("lote_id", activeSession!.lote_id)
        .eq("rodovia_id", activeSession!.rodovia_id);
      return count || 0;
    },
    enabled: !!activeSession,
  });

  const { data: countDefensas } = useQuery({
    queryKey: ["count-defensas", activeSession?.lote_id, activeSession?.rodovia_id],
    queryFn: async () => {
      const { count } = await supabase
        .from("defensas")
        .select("*", { count: "exact", head: true })
        .eq("lote_id", activeSession!.lote_id)
        .eq("rodovia_id", activeSession!.rodovia_id);
      return count || 0;
    },
    enabled: !!activeSession,
  });

  const { data: countNecDefensas } = useQuery({
    queryKey: ["count-nec-defensas", activeSession?.lote_id, activeSession?.rodovia_id],
    queryFn: async () => {
      const { count } = await supabase
        .from("necessidades_defensas")
        .select("*", { count: "exact", head: true })
        .eq("lote_id", activeSession!.lote_id)
        .eq("rodovia_id", activeSession!.rodovia_id);
      return count || 0;
    },
    enabled: !!activeSession,
  });

  // Verificar Marco Zero
  const { data: marcoZero } = useMarcoZeroRecente({
    loteId: activeSession?.lote_id,
    rodoviaId: activeSession?.rodovia_id,
  });

  // Se Marco Zero existe, buscar dados consolidados
  const { data: consolidatedData } = useQuery({
    queryKey: ["inventario-consolidado", activeSession?.lote_id, activeSession?.rodovia_id],
    queryFn: async () => {
      if (!activeSession?.lote_id || !activeSession?.rodovia_id) return null;
      
      const { data, error } = await supabase
        .from("vw_inventario_consolidado")
        .select("*")
        .eq("lote_id", activeSession.lote_id)
        .eq("rodovia_id", activeSession.rodovia_id)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      // Transformar dados da view em objeto para acesso fácil
      return {
        marcas_longitudinais: data.total_marcas_longitudinais || 0,
        cilindros: data.total_cilindros || 0,
        inscricoes: data.total_inscricoes || 0,
        tachas: data.total_tachas || 0,
        placas: data.total_placas || 0,
        porticos: data.total_porticos || 0,
        defensas: data.total_defensas || 0,
      } as Record<string, number>;
    },
    enabled: !!activeSession?.lote_id && !!activeSession?.rodovia_id && !!marcoZero,
  });

  // Contador de elementos pendentes (para coordenadores)
  const { data: countPendentes } = useQuery({
    queryKey: ["count-elementos-pendentes"],
    queryFn: async () => {
      const { count } = await supabase
        .from("elementos_pendentes_aprovacao")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente_aprovacao");
      return count || 0;
    },
    enabled: isAdminOrCoordinator,
  });

  // Contador de divergências pendentes de reconciliação (para coordenadores)
  const { data: countDivergencias } = useQuery({
    queryKey: ["count-divergencias-pendentes", activeSession?.lote_id, activeSession?.rodovia_id],
    queryFn: async () => {
      if (!activeSession) return 0;
      
      const gruposElementos: GrupoElemento[] = ['placas', 'defensas', 'porticos', 'marcas_longitudinais', 'inscricoes', 'cilindros', 'tachas'];
      
      let totalDivergencias = 0;
      for (const grupo of gruposElementos) {
        const config = getConfig(grupo);
        const { count } = await supabase
          .from(config.tabelaNecessidades as any)
          .select("id", { count: "exact", head: true })
          .eq("lote_id", activeSession.lote_id)
          .eq("rodovia_id", activeSession.rodovia_id)
          .eq("divergencia", true)
          .eq("reconciliado", false);
        totalDivergencias += (count || 0);
      }
      return totalDivergencias;
    },
    enabled: isAdminOrCoordinator && !!activeSession,
    refetchInterval: 30000,
    staleTime: 0,
    gcTime: 0,
  });

  // Contador de intervenções pendentes de aprovação (para coordenadores)
  const { data: countIntervencoesPendentes } = useQuery({
    queryKey: ["count-intervencoes-pendentes"],
    queryFn: async () => {
      const tabelas = [
        'ficha_marcas_longitudinais_intervencoes',
        'ficha_cilindros_intervencoes',
        'ficha_porticos_intervencoes',
        'defensas_intervencoes',
        'ficha_inscricoes_intervencoes',
        'ficha_tachas_intervencoes',
        'ficha_placa_intervencoes',
      ];
      
      let totalPendentes = 0;
      for (const tabela of tabelas) {
        const { count } = await supabase
          .from(tabela as any)
          .select("*", { count: "exact", head: true })
          .eq("pendente_aprovacao_coordenador", true);
        totalPendentes += (count || 0);
      }
      return totalPendentes;
    },
    enabled: isAdminOrCoordinator,
    refetchInterval: 30000,
  });


  // Handler genérico para abrir diálogo de intervenção
  const handleAbrirIntervencao = (
    elemento: any, 
    tipo: "marcas_longitudinais" | "placas" | "tachas" | "cilindros" | 
         "porticos" | "inscricoes" | "defensas"
  ) => {
    setElementoParaIntervencao(elemento);
    setTipoIntervencao(tipo);
    setIntervencaoDialogOpen(true);
  };

  // Função para renderizar badges (consolidado ou separado)
  const renderInventoryBadge = (
    tipoElemento: string,
    countCadastro: number | undefined,
    countNecessidades: number | undefined
  ) => {
    // Se existe Marco Zero, mostrar badge consolidado
    if (marcoZero && consolidatedData?.[tipoElemento]) {
      return (
        <ConsolidatedInventoryBadge
          total={consolidatedData[tipoElemento]}
          dataMarcoZero={new Date(marcoZero.created_at)}
        />
      );
    }

    // Senão, mostrar badges separados (comportamento atual)
    return (
      <div className="flex items-center gap-1">
        <Badge 
          className="h-5 px-1.5 text-xs cursor-pointer bg-gray-200 text-black hover:bg-gray-300 transition-colors border-0"
          onClick={(e) => {
            e.stopPropagation();
            navigate("/dashboard-necessidades");
          }}
          title="Cadastro - Clique para ver Necessidades"
        >
          {countCadastro || 0}
        </Badge>
        <Badge 
          className="h-5 px-1.5 text-xs cursor-pointer bg-blue-500 text-white hover:bg-blue-600 transition-colors border-0"
          onClick={(e) => {
            e.stopPropagation();
            navigate("/dashboard-necessidades");
          }}
          title="Necessidades - Clique para acessar"
        >
          {countNecessidades || 0}
        </Badge>
      </div>
    );
  };

 // imports (garanta que existam no topo do arquivo)
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// ...

// Verificação de roles (admin/coordenador)
useEffect(() => {
  let alive = true;
  const checkAdminOrCoordinator = async () => {
    if (!user) return;
    const { data /*, error*/ } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "coordenador"])
      .maybeSingle();

    if (!alive) return;
    setIsAdminOrCoordinator(!!data);
  };
  checkAdminOrCoordinator();
  return () => {
    alive = false;
  };
}, [user]);

// callback existente
const handleSessionStarted = () => {
  refreshSession();
};

// Patch mínimo de navegação (não força /modo-campo nem muda lastRoute)
const location = useLocation();
const navigate = useNavigate();

useEffect(() => {
  if (!authLoading && !user) {
    navigate("/auth", { replace: true });
    return;
  }
  if (!user) return;

  const modoAtual = localStorage.getItem("modoAcesso"); // 'campo' | 'web' | null
  const pathname = location.pathname;

  // Evita pular as telas intermediárias: só redireciona se já está em 'campo' e não estiver em /modo-campo
  if (modoAtual === "campo" && !pathname.startsWith("/modo-campo")) {
    navigate("/modo-campo", { replace: true });
    return;
  }

  // Se não há modo definido, define 'web' como padrão sem redirecionar
  if (!modoAtual) {
    localStorage.setItem("modoAcesso", "web");
  }

  // Limpeza leve (mantém comportamento anterior)
  sessionStorage.removeItem("vableCardHidden");
}, [user, authLoading, location.pathname, navigate]);


      
      // Limpar flag de card VABLE oculto ao entrar (reaparece no próximo login)
      sessionStorage.removeItem('vableCardHidden');
      
      localStorage.setItem('lastRoute', '/');
    }
  }, [user, authLoading, navigate, isModernIOS]);
  const handleSignOut = async () => {
    try {
      await signOut();
      // O redirecionamento será feito automaticamente pelo useEffect que monitora user
    } catch (error: any) {
      console.error("Erro ao fazer logout:", error);
      navigate("/auth", {
        replace: true
      });
    }
  };

  if (authLoading || sessionLoading) {
    return <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>;
  }

  // Determinar qual logo usar
  const logoToDisplay = supervisora?.usar_logo_customizado && supervisora?.logo_url ? supervisora.logo_url : logoOperaVia;
  const logoAlt = supervisora?.usar_logo_customizado && supervisora?.logo_url ? `${supervisora.nome_empresa} - Sistema de Supervisão` : "OperaVia - Sistema de Supervisão de Operação Rodoviária";
  return <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-primary/10 via-background to-secondary/10 overflow-y-auto">
      <header className="bg-primary shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/95 rounded-lg px-3 py-2 shadow-md">
                <img src={logoToDisplay} alt={logoAlt} className="h-24 object-contain cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate("/")} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary-foreground">OperaVia</h1>
                <p className="text-sm text-primary-foreground/80">Sistema de Supervisão de Operação Rodoviária</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {user?.email && <div className="bg-white/20 text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium border border-white/30">
                  👤 {user.email}
                </div>}
              <NotificationBell />
              {/* <Button variant="secondary" size="lg" className="font-semibold shadow-md hover:shadow-lg transition-shadow" onClick={() => navigate("/modulos")}>
                <Boxes className="mr-2 h-5 w-5" />
                Módulos
              </Button> */}
              {isAdminOrCoordinator && <div className="relative">
                  <Button variant="secondary" size="lg" className="font-semibold shadow-md hover:shadow-lg transition-shadow" onClick={() => navigate("/coordenacao-fiscalizacao")}>
                    <ClipboardList className="mr-2 h-5 w-5" />
                    Gestão
                  </Button>
                  {isAdminOrCoordinator && (
                    <TooltipProvider>
                      <div className="absolute -top-2 -right-2 flex gap-1">
                        {/* Badge Elementos Pendentes - VERMELHO */}
                        {(countPendentes || 0) > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/elementos-pendentes');
                                }}
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                              >
                                <Badge className="h-6 min-w-[1.5rem] px-1.5 rounded-full bg-red-500 text-white font-bold text-xs">
                                  {countPendentes}
                                </Badge>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Elementos Pendentes de Aprovação</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        
                        {/* Badge Divergências - LARANJA */}
                        {(countDivergencias || 0) > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/reconciliacao-pendente');
                                }}
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                              >
                                <Badge className="h-6 min-w-[1.5rem] px-1.5 rounded-full bg-orange-500 text-white font-bold text-xs">
                                  {countDivergencias}
                                </Badge>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Divergências na Reconciliação</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        
                        {/* Badge Intervenções Pendentes - AZUL */}
                        {(countIntervencoesPendentes || 0) > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/revisao-intervencoes');
                                }}
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                              >
                                <Badge className="h-6 min-w-[1.5rem] px-1.5 rounded-full bg-blue-500 text-white font-bold text-xs">
                                  {countIntervencoesPendentes}
                                </Badge>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Intervenções Aguardando Revisão</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TooltipProvider>
                  )}
                </div>
              }
              {isAdminOrCoordinator && <Button variant="default" size="lg" className="font-semibold bg-accent text-accent-foreground shadow-md hover:shadow-lg transition-shadow hover:bg-accent/90" onClick={() => navigate("/admin")}>
                  <Settings className="mr-2 h-5 w-5" />
                  Admin
                </Button>}
              <Button variant="destructive" size="lg" onClick={handleSignOut} className="font-semibold shadow-md hover:shadow-lg transition-shadow">
                <LogOut className="mr-2 h-5 w-5" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 space-y-6">
        {supervisora?.codigo_convite && showInviteCode && <Card className="bg-accent/10 border-accent/20 shadow-md relative">
            <Button 
              variant="ghost" 
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={() => {
                setShowInviteCode(false);
                localStorage.setItem('hideInviteCode', 'true');
                toast.success("Mensagem ocultada");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between pr-8">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Código de Convite da Supervisora</h3>
                  <code className="text-2xl font-bold font-mono bg-accent/20 px-4 py-2 rounded-md inline-block">
                    {supervisora.codigo_convite}
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Compartilhe este código com novos usuários para que eles possam se cadastrar vinculados à {supervisora.nome_empresa}
                  </p>
                </div>
                <Button variant="outline" size="lg" onClick={() => {
              navigator.clipboard.writeText(supervisora.codigo_convite!);
              toast.success("Código copiado!");
            }} className="shrink-0">
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
            </CardContent>
          </Card>}

        {activeSession ? <>
            <Card className="bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-elevated border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      <MapPin className="h-6 w-6" />
                      Sessão de Trabalho Ativa
                    </CardTitle>
                    <CardDescription className="text-primary-foreground/90 text-base mt-1">
                      Seus dados estão sendo coletados para este lote e rodovia
                    </CardDescription>
                  </div>
                  <Button variant="default" size="lg" onClick={endSession} className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold shadow-md">
                    <ArrowLeftRight className="h-5 w-5 mr-2" />
                    Trocar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-lg">
                  <Briefcase className="h-5 w-5" />
                  <span className="font-bold">Lote:</span>
                  <span className="font-semibold">{activeSession.lote?.numero}</span>
                  {activeSession.lote?.empresa?.nome && <span className="ml-2 opacity-90">
                      ({activeSession.lote?.empresa?.nome})
                    </span>}
                </div>
                <div className="flex items-center gap-3 text-lg">
                  <MapPin className="h-5 w-5" />
                  <span className="font-bold">Rodovia:</span>
                  <span className="font-semibold">
                    {activeSession.rodovia?.codigo || "Carregando..."}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Seção VABLE - Rastreabilidade */}
            {showVableCard && (
              <Card className="border-2 border-primary/30 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-2xl">
                        <Activity className="h-6 w-6 text-primary" />
                        VABLE - Sistema de Rastreabilidade
                      </CardTitle>
                      <CardDescription className="text-base">
                        Controle de intervenções conforme IN 3/2025 do DNIT
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setShowVableCard(false);
                        sessionStorage.setItem('vableCardHidden', 'true');
                        toast.success("Card VABLE ocultado. Reaparecerá no próximo login.");
                      }}
                      className="shrink-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
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
            )}

            <div className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Inventário Dinâmico da Rodovia</CardTitle>
                    <CardDescription>Consulte o inventário atualizado de todos os elementos de sinalização da rodovia</CardDescription>
                  </CardHeader>
                  <CardContent>
                  <Tabs defaultValue="sv" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="sh">
                        Sinalização Horizontal (SH)
                      </TabsTrigger>
                      <TabsTrigger value="sv">
                        Sinalização Vertical (SV)
                      </TabsTrigger>
                      <TabsTrigger value="defensas-pront" className="flex items-center gap-2">
                        <span>Defensas</span>
                        {renderInventoryBadge("defensas", countDefensas, countNecDefensas)}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="sh" className="mt-4">
                      <Tabs value={inventarioShSubTab} onValueChange={setInventarioShSubTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="longitudinais" className="flex items-center gap-2">
                            <span>Marcas Longitudinais</span>
                            {renderInventoryBadge("marcas_longitudinais", countMarcasLong, countNecMarcasLong)}
                          </TabsTrigger>
                          <TabsTrigger value="transversais" className="flex items-center gap-2">
                            <span>Cilindros</span>
                            {renderInventoryBadge("cilindros", countCilindros, countNecCilindros)}
                          </TabsTrigger>
                          <TabsTrigger value="inscricoes" className="flex items-center gap-2">
                            <span>Inscrições</span>
                            {renderInventoryBadge("inscricoes", countInscricoes, countNecInscricoes)}
                          </TabsTrigger>
                          <TabsTrigger value="tachas" className="flex items-center gap-2">
                            <span>Tachas</span>
                            {renderInventoryBadge("tachas", countTachas, countNecTachas)}
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="longitudinais" className="mt-4">
                          <InventarioMarcasLongitudinaisViewer 
                            loteId={activeSession.lote_id} 
                            rodoviaId={activeSession.rodovia_id}
                            onRegistrarIntervencao={(marca) => handleAbrirIntervencao(marca, "marcas_longitudinais")}
                          />
                        </TabsContent>
                        <TabsContent value="transversais" className="mt-4">
                          <InventarioCilindrosViewer 
                            loteId={activeSession.lote_id} 
                            rodoviaId={activeSession.rodovia_id}
                            onRegistrarIntervencao={(cilindro) => handleAbrirIntervencao(cilindro, "cilindros")}
                          />
                        </TabsContent>
                        <TabsContent value="inscricoes" className="mt-4">
                          <InventarioInscricoesViewer 
                            loteId={activeSession.lote_id} 
                            rodoviaId={activeSession.rodovia_id}
                            onRegistrarIntervencao={(inscricao) => handleAbrirIntervencao(inscricao, "inscricoes")}
                          />
                        </TabsContent>
                        <TabsContent value="tachas" className="mt-4">
                          <InventarioTachasViewer 
                            loteId={activeSession.lote_id} 
                            rodoviaId={activeSession.rodovia_id}
                            onRegistrarIntervencao={(tacha) => handleAbrirIntervencao(tacha, "tachas")}
                          />
                        </TabsContent>
                      </Tabs>
                    </TabsContent>
                    <TabsContent value="sv" className="mt-4">
                      <Tabs value={inventarioSvSubTab} onValueChange={setInventarioSvSubTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="placas" className="flex items-center gap-2">
                            <span>Placas</span>
                            {renderInventoryBadge("placas", countPlacas, countNecPlacas)}
                          </TabsTrigger>
                          <TabsTrigger value="porticos" className="flex items-center gap-2">
                            <span>Pórticos (P/SM) e Braços Projetados</span>
                            {renderInventoryBadge("porticos", countPorticos, countNecPorticos)}
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="placas" className="mt-4">
                          <InventarioPlacasViewer 
                            loteId={activeSession.lote_id} 
                            rodoviaId={activeSession.rodovia_id}
                            onRegistrarIntervencao={(placa) => handleAbrirIntervencao(placa, "placas")}
                          />
                        </TabsContent>
                        <TabsContent value="porticos" className="mt-4">
                          <InventarioPorticosViewer 
                            loteId={activeSession.lote_id} 
                            rodoviaId={activeSession.rodovia_id}
                            onRegistrarIntervencao={(portico) => handleAbrirIntervencao(portico, "porticos")}
                          />
                        </TabsContent>
                      </Tabs>
                    </TabsContent>
                    <TabsContent value="defensas-pront" className="mt-4">
                      <InventarioDefensasViewer 
                        loteId={activeSession.lote_id} 
                        rodoviaId={activeSession.rodovia_id}
                        onRegistrarIntervencao={(defensa) => handleAbrirIntervencao(defensa, "defensas")}
                      />
                    </TabsContent>
                  </Tabs>
                  </CardContent>
                </Card>
              </div>
          </> : <SessionSelector userId={user?.id} onSessionStarted={handleSessionStarted} />}
      </main>

      {/* Dialog de Implementar Intervenção */}
      <Dialog open={intervencaoDialogOpen} onOpenChange={setIntervencaoDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Implementar Intervenção</DialogTitle>
            <DialogDescription>
              Registre a intervenção executada neste elemento do inventário
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-1">
            {tipoIntervencao === "marcas_longitudinais" && elementoParaIntervencao && (
              <IntervencoesSHForm
                marcaSelecionada={elementoParaIntervencao}
                modo="normal"
                onIntervencaoRegistrada={() => {
                  setIntervencaoDialogOpen(false);
                  toast.success("Intervenção em Marca Longitudinal registrada com sucesso!");
                }}
              />
            )}

            {tipoIntervencao === "placas" && elementoParaIntervencao && (
              <IntervencoesSVForm
                placaSelecionada={elementoParaIntervencao}
                onIntervencaoRegistrada={() => {
                  setIntervencaoDialogOpen(false);
                  toast.success("Intervenção em Placa registrada com sucesso!");
                }}
              />
            )}

            {tipoIntervencao === "tachas" && elementoParaIntervencao && (
              <IntervencoesTachaForm
                tachaSelecionada={elementoParaIntervencao}
                modo="normal"
                onIntervencaoRegistrada={() => {
                  setIntervencaoDialogOpen(false);
                  toast.success("Intervenção em Tacha registrada com sucesso!");
                }}
              />
            )}

            {tipoIntervencao === "inscricoes" && elementoParaIntervencao && (
              <IntervencoesInscricoesForm
                inscricaoSelecionada={elementoParaIntervencao}
                modo="normal"
                onIntervencaoRegistrada={() => {
                  setIntervencaoDialogOpen(false);
                  toast.success("Intervenção em Inscrição registrada com sucesso!");
                }}
              />
            )}

            {tipoIntervencao === "cilindros" && elementoParaIntervencao && (
              <IntervencoesCilindrosForm
                cilindroSelecionado={elementoParaIntervencao}
                modo="normal"
                onIntervencaoRegistrada={() => {
                  setIntervencaoDialogOpen(false);
                  toast.success("Intervenção em Cilindro registrada com sucesso!");
                }}
              />
            )}

            {tipoIntervencao === "porticos" && elementoParaIntervencao && (
              <IntervencoesPorticosForm
                porticoSelecionado={elementoParaIntervencao}
                modo="normal"
                onIntervencaoRegistrada={() => {
                  setIntervencaoDialogOpen(false);
                  toast.success("Intervenção em Pórtico registrada com sucesso!");
                }}
              />
            )}

            {tipoIntervencao === "defensas" && elementoParaIntervencao && (
              <DefensasIntervencoesForm
                defensaSelecionada={elementoParaIntervencao}
                modo="normal"
                onIntervencaoRegistrada={() => {
                  setIntervencaoDialogOpen(false);
                  toast.success("Intervenção em Defensa registrada com sucesso!");
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 pb-6">
        <Card className="bg-card shadow-lg border-primary/20">
          <CardContent className="py-4">
            <p className="text-sm text-center">
              <span className="font-semibold text-foreground">Contato:</span>{" "}
              <a href="mailto:contato@operavia.online" className="text-primary hover:underline font-medium">
                contato@operavia.online
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default Index;