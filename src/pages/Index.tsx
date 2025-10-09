import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkSession } from "@/hooks/useWorkSession";
import { useSupervisora } from "@/hooks/useSupervisora";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, MapPin, Briefcase, Settings, ClipboardList, ArrowLeftRight, Eye, Boxes, Copy } from "lucide-react";
import SessionSelector from "@/components/SessionSelector";
import NaoConformidadeForm from "@/components/NaoConformidadeForm";
import FrenteLiberadaForm from "@/components/FrenteLiberadaForm";
import RetrorrefletividadeEstaticaForm from "@/components/RetrorrefletividadeEstaticaForm";
import RetrorrefletividadeDinamicaForm from "@/components/RetrorrefletividadeDinamicaForm";
import DefensasForm from "@/components/DefensasForm";
import IntervencoesSHForm from "@/components/IntervencoesSHForm";
import IntervencoesInscricoesForm from "@/components/IntervencoesInscricoesForm";
import IntervencoesSVForm from "@/components/IntervencoesSVForm";
import { IntervencoesTachaForm } from "@/components/IntervencoesTachaForm";
import { RegistroNCForm } from "@/components/RegistroNCForm";
import { FichaVerificacaoForm } from "@/components/FichaVerificacaoForm";
import { FichaPlacaForm } from "@/components/FichaPlacaForm";
import { toast } from "sonner";
import logoOperaVia from "@/assets/logo-operavia.jpg";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { activeSession, loading: sessionLoading, refreshSession, endSession } = useWorkSession(user?.id);
  const { data: supervisora } = useSupervisora();
  const [isAdminOrCoordinator, setIsAdminOrCoordinator] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'frentes';
  });

  useEffect(() => {
    const checkAdminOrCoordinator = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "coordenador"])
        .maybeSingle();

      setIsAdminOrCoordinator(!!data);
    };

    checkAdminOrCoordinator();
  }, [user]);

  const handleSessionStarted = () => {
    refreshSession();
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      // O redirecionamento será feito automaticamente pelo useEffect que monitora user
    } catch (error: any) {
      console.error("Erro ao fazer logout:", error);
      navigate("/auth", { replace: true });
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem('activeTab', value);
  };

  if (authLoading || sessionLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Determinar qual logo usar
  const logoToDisplay = supervisora?.usar_logo_customizado && supervisora?.logo_url 
    ? supervisora.logo_url 
    : logoOperaVia;
  const logoAlt = supervisora?.usar_logo_customizado && supervisora?.logo_url
    ? `${supervisora.nome_empresa} - Sistema de Supervisão`
    : "OperaVia - Sistema Nacional de Supervisão de Operação Rodoviária";

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-primary/10 via-background to-secondary/10 overflow-y-auto">
      <header className="bg-primary shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/95 rounded-lg px-3 py-2 shadow-md">
                <img 
                  src={logoToDisplay} 
                  alt={logoAlt} 
                  className="h-16 object-contain cursor-pointer hover:scale-105 transition-transform" 
                  onClick={() => navigate("/")}
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary-foreground">OperaVia</h1>
                <p className="text-sm text-primary-foreground/80">Sistema Nacional de Supervisão de Operação Rodoviária</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {user?.email && (
                <div className="bg-white/20 text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium border border-white/30">
                  👤 {user.email}
                </div>
              )}
              <Button 
                variant="secondary" 
                size="lg"
                className="font-semibold shadow-md hover:shadow-lg transition-shadow"
                onClick={() => navigate("/modulos")}
              >
                <Boxes className="mr-2 h-5 w-5" />
                Módulos
              </Button>
              <Button 
                variant="secondary" 
                size="lg"
                className="font-semibold shadow-md hover:shadow-lg transition-shadow"
                onClick={() => navigate("/coordenacao-fiscalizacao")}
              >
                <ClipboardList className="mr-2 h-5 w-5" />
                Gestão
              </Button>
              {isAdminOrCoordinator && (
                <Button 
                  variant="default"
                  size="lg"
                  className="font-semibold bg-accent text-accent-foreground shadow-md hover:shadow-lg transition-shadow hover:bg-accent/90"
                  onClick={() => navigate("/admin")}
                >
                  <Settings className="mr-2 h-5 w-5" />
                  Admin
                </Button>
              )}
              <Button 
                variant="destructive" 
                size="lg"
                onClick={handleSignOut}
                className="font-semibold shadow-md hover:shadow-lg transition-shadow"
              >
                <LogOut className="mr-2 h-5 w-5" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 space-y-6">
        {supervisora?.codigo_convite && (
          <Card className="bg-accent/10 border-accent/20 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Código de Convite da Supervisora</h3>
                  <code className="text-2xl font-bold font-mono bg-accent/20 px-4 py-2 rounded-md inline-block">
                    {supervisora.codigo_convite}
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Compartilhe este código com novos usuários para que eles possam se cadastrar vinculados à {supervisora.nome_empresa}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    navigator.clipboard.writeText(supervisora.codigo_convite!);
                    toast.success("Código copiado!");
                  }}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeSession ? (
          <>
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
                  <Button 
                    variant="default"
                    size="lg"
                    onClick={endSession}
                    className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold shadow-md"
                  >
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
                  {activeSession.lote?.empresa?.nome && (
                    <span className="ml-2 opacity-90">
                      ({activeSession.lote?.empresa?.nome})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-lg">
                  <MapPin className="h-5 w-5" />
                  <span className="font-bold">Rodovia:</span>
                  <span className="font-semibold">
                    {activeSession.rodovia?.codigo}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-8 h-auto bg-muted p-2 gap-1">
                <TabsTrigger value="frentes" className="flex flex-col py-3 px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold">
                  <span className="text-xs">Frente de Serviço</span>
                </TabsTrigger>
                <TabsTrigger value="ncs" className="flex flex-col py-3 px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold">
                  <span className="text-xs">Não Conformidade</span>
                </TabsTrigger>
                <TabsTrigger value="retrorrefletividade" className="flex flex-col py-3 px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold">
                  <span className="text-xs">Retrorefletividade</span>
                </TabsTrigger>
                <TabsTrigger value="defensas" className="flex flex-col py-3 px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold">
                  <span className="text-xs">Defensas</span>
                </TabsTrigger>
                <TabsTrigger value="intervencoes" className="flex flex-col py-3 px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold">
                  <span className="text-xs">Intervenções</span>
                </TabsTrigger>
                <TabsTrigger value="registro-nc" className="flex flex-col py-3 px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold">
                  <span className="text-xs font-bold">3.1.18</span>
                  <span className="text-xs">Reg. NC</span>
                </TabsTrigger>
                <TabsTrigger value="ficha-verif" className="flex flex-col py-3 px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold">
                  <span className="text-xs font-bold">3.1.19</span>
                  <span className="text-xs">Ficha Verif</span>
                </TabsTrigger>
                <TabsTrigger value="ficha-placa" className="flex flex-col py-3 px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold">
                  <span className="text-xs font-bold">3.1.20</span>
                  <span className="text-xs">Ficha Placa</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="frentes" className="mt-6">
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button 
                      variant="secondary"
                      onClick={() => navigate("/minhas-frentes-liberadas")}
                      className="shadow-md hover:shadow-lg transition-shadow"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver meus registros
                    </Button>
                  </div>
                  <FrenteLiberadaForm
                    loteId={activeSession.lote_id}
                    rodoviaId={activeSession.rodovia_id}
                  />
                </div>
              </TabsContent>
              <TabsContent value="ncs" className="mt-6">
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button 
                      variant="secondary"
                      onClick={() => navigate("/minhas-ncs")}
                      className="shadow-md hover:shadow-lg transition-shadow"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver meus registros
                    </Button>
                  </div>
                  <NaoConformidadeForm
                    loteId={activeSession.lote_id}
                    rodoviaId={activeSession.rodovia_id}
                  />
                </div>
              </TabsContent>
              <TabsContent value="retrorrefletividade" className="mt-6">
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button 
                      variant="secondary"
                      onClick={() => navigate("/minhas-retrorrefletividades")}
                      className="shadow-md hover:shadow-lg transition-shadow"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver meus registros
                    </Button>
                  </div>
                  <Tabs defaultValue="estatica" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="estatica">
                        <span className="text-xs font-bold mr-2">3.1.3.1</span>
                        Estática
                      </TabsTrigger>
                      <TabsTrigger value="dinamica">
                        <span className="text-xs font-bold mr-2">3.1.3.2</span>
                        Dinâmica
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="estatica" className="mt-4">
                      <RetrorrefletividadeEstaticaForm
                        loteId={activeSession.lote_id}
                        rodoviaId={activeSession.rodovia_id}
                      />
                    </TabsContent>
                    <TabsContent value="dinamica" className="mt-4">
                      <RetrorrefletividadeDinamicaForm
                        loteId={activeSession.lote_id}
                        rodoviaId={activeSession.rodovia_id}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </TabsContent>
              <TabsContent value="defensas" className="mt-6">
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button 
                      variant="secondary"
                      onClick={() => navigate("/minhas-defensas")}
                      className="shadow-md hover:shadow-lg transition-shadow"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver meus registros
                    </Button>
                  </div>
                  <DefensasForm
                    loteId={activeSession.lote_id}
                    rodoviaId={activeSession.rodovia_id}
                  />
                </div>
              </TabsContent>
              <TabsContent value="intervencoes" className="mt-6">
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button 
                      variant="secondary"
                      onClick={() => navigate("/minhas-intervencoes")}
                      className="shadow-md hover:shadow-lg transition-shadow"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver meus registros
                    </Button>
                  </div>
                  <Tabs defaultValue="sh" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="sh">
                        Marcas Longitudinais
                      </TabsTrigger>
                      <TabsTrigger value="sv">
                        Marcas Transversais
                      </TabsTrigger>
                      <TabsTrigger value="inscricoes">
                        Setas, Símbolos e Legendas
                      </TabsTrigger>
                      <TabsTrigger value="tacha">
                        Tachas
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="sh" className="mt-4">
                      <IntervencoesSHForm
                        loteId={activeSession.lote_id}
                        rodoviaId={activeSession.rodovia_id}
                      />
                    </TabsContent>
                    <TabsContent value="inscricoes" className="mt-4">
                      <IntervencoesInscricoesForm
                        loteId={activeSession.lote_id}
                        rodoviaId={activeSession.rodovia_id}
                      />
                    </TabsContent>
                    <TabsContent value="sv" className="mt-4">
                      <IntervencoesSVForm
                        loteId={activeSession.lote_id}
                        rodoviaId={activeSession.rodovia_id}
                      />
                    </TabsContent>
                    <TabsContent value="tacha" className="mt-4">
                      <IntervencoesTachaForm
                        loteId={activeSession.lote_id}
                        rodoviaId={activeSession.rodovia_id}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </TabsContent>
              <TabsContent value="registro-nc" className="mt-6">
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button 
                      variant="secondary"
                      onClick={() => navigate("/meus-registros-nc")}
                      className="shadow-md hover:shadow-lg transition-shadow"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver meus registros
                    </Button>
                  </div>
                  <RegistroNCForm
                    loteId={activeSession.lote_id}
                    rodoviaId={activeSession.rodovia_id}
                  />
                </div>
              </TabsContent>
              <TabsContent value="ficha-verif" className="mt-6">
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button 
                      variant="secondary"
                      onClick={() => navigate("/minhas-fichas-verificacao")}
                      className="shadow-md hover:shadow-lg transition-shadow"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver minhas fichas
                    </Button>
                  </div>
                  <FichaVerificacaoForm
                    loteId={activeSession.lote_id}
                    rodoviaId={activeSession.rodovia_id}
                  />
                </div>
              </TabsContent>
              <TabsContent value="ficha-placa" className="mt-6">
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button 
                      variant="secondary"
                      onClick={() => navigate("/minhas-fichas-placa")}
                      className="shadow-md hover:shadow-lg transition-shadow"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver minhas fichas
                    </Button>
                  </div>
                  <FichaPlacaForm
                    loteId={activeSession.lote_id}
                    rodoviaId={activeSession.rodovia_id}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <SessionSelector userId={user?.id} onSessionStarted={handleSessionStarted} />
        )}
      </main>

      <div className="container mx-auto px-4 pb-6">
        <Card className="bg-card shadow-lg border-primary/20">
          <CardContent className="py-4">
            <p className="text-sm text-center">
              <span className="font-semibold text-foreground">Contato:</span>{" "}
              <a href="mailto:operavia.online@gmail.com" className="text-primary hover:underline font-medium">
                operavia.online@gmail.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
