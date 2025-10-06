import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkSession } from "@/hooks/useWorkSession";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, MapPin, Briefcase, Settings, ClipboardList, ArrowLeftRight, MapPinned, Gauge, ShieldAlert, PaintBucket, Stamp } from "lucide-react";
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
import logoBrLegal from "@/assets/logo-brlegal2.png";
import logoGoverno from "@/assets/logo-governo.png";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { activeSession, loading: sessionLoading, refreshSession, endSession } = useWorkSession(user?.id);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!data);
    };

    checkAdmin();
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
    await signOut();
    navigate("/auth");
  };

  if (authLoading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 to-secondary/5">
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <img 
              src={logoBrLegal} 
              alt="BR-LEGAL 2" 
              className="h-16 object-contain cursor-pointer hover:opacity-80 transition-opacity" 
              onClick={() => navigate("/")}
            />
            <div className="flex items-center gap-2 flex-wrap">
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => navigate("/ncs-coordenador")}>
                  <ClipboardList className="mr-2 h-4 w-4" />
                  NCs por Lote
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate("/minhas-ncs")}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Minhas NCs
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/minhas-frentes-liberadas")}>
                <MapPinned className="mr-2 h-4 w-4" />
                Frentes
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/minhas-retrorrefletividades")}>
                <Gauge className="mr-2 h-4 w-4" />
                Retro Est
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/minhas-retrorrefletividades-dinamicas")}>
                <Gauge className="mr-2 h-4 w-4" />
                Retro Din
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/minhas-defensas")}>
                <ShieldAlert className="mr-2 h-4 w-4" />
                Defensas
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/minhas-intervencoes-sh")}>
                <PaintBucket className="mr-2 h-4 w-4" />
                Interv. SH
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/minhas-intervencoes-inscricoes")}>
                <Stamp className="mr-2 h-4 w-4" />
                Inscrições
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/minhas-intervencoes-sv")}>
                <PaintBucket className="mr-2 h-4 w-4" />
                Interv. SV
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/minhas-intervencoes-tacha")}>
                <PaintBucket className="mr-2 h-4 w-4" />
                Interv. Tacha
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/meus-registros-nc")}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Registro NC
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/minhas-fichas-verificacao")}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Fichas Verif.
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/minhas-fichas-placa")}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Fichas Placa
              </Button>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Admin
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 space-y-6">
        {activeSession ? (
          <>
            <Card className="bg-primary text-primary-foreground">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Sessão de Trabalho Ativa
                    </CardTitle>
                    <CardDescription className="text-primary-foreground/80">
                      Seus dados estão sendo coletados para este lote e rodovia
                    </CardDescription>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={endSession}
                    className="shrink-0"
                  >
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                    Trocar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  <span className="font-semibold">Lote:</span>
                  <span>{activeSession.lote?.numero}</span>
                  {activeSession.lote?.empresa?.nome && (
                    <span className="ml-2 text-sm opacity-80">
                      ({activeSession.lote.empresa.nome})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="font-semibold">Rodovia:</span>
                  <span>
                    {activeSession.rodovia?.codigo}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="frentes" className="w-full">
              <TabsList className="grid w-full grid-cols-12 h-auto">
                <TabsTrigger value="frentes" className="flex flex-col py-3 px-1">
                  <span className="text-xs font-semibold">2.2</span>
                  <span className="text-xs">Frentes</span>
                </TabsTrigger>
                <TabsTrigger value="ncs" className="flex flex-col py-3 px-1">
                  <span className="text-xs font-semibold">2.3</span>
                  <span className="text-xs">NCs</span>
                </TabsTrigger>
                <TabsTrigger value="retro-est" className="flex flex-col py-3 px-1">
                  <span className="text-xs font-semibold">3.1.3.1</span>
                  <span className="text-xs">R. Est</span>
                </TabsTrigger>
                <TabsTrigger value="retro-din" className="flex flex-col py-3 px-1">
                  <span className="text-xs font-semibold">3.1.3.2</span>
                  <span className="text-xs">R. Din</span>
                </TabsTrigger>
                <TabsTrigger value="defensas" className="flex flex-col py-3 px-1">
                  <span className="text-xs font-semibold">3.1.4</span>
                  <span className="text-xs">Defensas</span>
                </TabsTrigger>
                <TabsTrigger value="int-sh" className="flex flex-col py-3 px-1">
                  <span className="text-xs font-semibold">3.1.5</span>
                  <span className="text-xs">Int. SH</span>
                </TabsTrigger>
                <TabsTrigger value="int-insc" className="flex flex-col py-3 px-1">
                  <span className="text-xs font-semibold">3.1.5</span>
                  <span className="text-xs">Int. Insc</span>
                </TabsTrigger>
                <TabsTrigger value="int-sv" className="flex flex-col py-3 px-1">
                  <span className="text-xs font-semibold">3.1.5</span>
                  <span className="text-xs">Int. SV</span>
                </TabsTrigger>
                <TabsTrigger value="int-tacha" className="flex flex-col py-3 px-1">
                  <span className="text-xs font-semibold">3.1.5</span>
                  <span className="text-xs">Int. Tacha</span>
                </TabsTrigger>
                <TabsTrigger value="registro-nc" className="flex flex-col py-3 px-1">
                  <span className="text-xs font-semibold">3.1.18</span>
                  <span className="text-xs">Reg. NC</span>
                </TabsTrigger>
                <TabsTrigger value="ficha-verif" className="flex flex-col py-3 px-1">
                  <span className="text-xs font-semibold">3.1.19</span>
                  <span className="text-xs">Ficha Verif</span>
                </TabsTrigger>
                <TabsTrigger value="ficha-placa" className="flex flex-col py-3 px-1">
                  <span className="text-xs font-semibold">3.1.20</span>
                  <span className="text-xs">Ficha Placa</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="frentes" className="mt-6">
                <FrenteLiberadaForm
                  loteId={activeSession.lote_id}
                  rodoviaId={activeSession.rodovia_id}
                />
              </TabsContent>
              <TabsContent value="ncs" className="mt-6">
                <NaoConformidadeForm
                  loteId={activeSession.lote_id}
                  rodoviaId={activeSession.rodovia_id}
                />
              </TabsContent>
              <TabsContent value="retro-est" className="mt-6">
                <RetrorrefletividadeEstaticaForm
                  loteId={activeSession.lote_id}
                  rodoviaId={activeSession.rodovia_id}
                />
              </TabsContent>
              <TabsContent value="retro-din" className="mt-6">
                <RetrorrefletividadeDinamicaForm
                  loteId={activeSession.lote_id}
                  rodoviaId={activeSession.rodovia_id}
                />
              </TabsContent>
              <TabsContent value="defensas" className="mt-6">
                <DefensasForm
                  loteId={activeSession.lote_id}
                  rodoviaId={activeSession.rodovia_id}
                />
              </TabsContent>
              <TabsContent value="int-sh" className="mt-6">
                <IntervencoesSHForm
                  loteId={activeSession.lote_id}
                  rodoviaId={activeSession.rodovia_id}
                />
              </TabsContent>
              <TabsContent value="int-insc" className="mt-6">
                <IntervencoesInscricoesForm
                  loteId={activeSession.lote_id}
                  rodoviaId={activeSession.rodovia_id}
                />
              </TabsContent>
              <TabsContent value="int-sv" className="mt-6">
                <IntervencoesSVForm
                  loteId={activeSession.lote_id}
                  rodoviaId={activeSession.rodovia_id}
                />
              </TabsContent>
              <TabsContent value="int-tacha" className="mt-6">
                <IntervencoesTachaForm
                  loteId={activeSession.lote_id}
                  rodoviaId={activeSession.rodovia_id}
                />
              </TabsContent>
              <TabsContent value="registro-nc" className="mt-6">
                <RegistroNCForm
                  loteId={activeSession.lote_id}
                  rodoviaId={activeSession.rodovia_id}
                />
              </TabsContent>
              <TabsContent value="ficha-verif" className="mt-6">
                <FichaVerificacaoForm
                  loteId={activeSession.lote_id}
                  rodoviaId={activeSession.rodovia_id}
                />
              </TabsContent>
              <TabsContent value="ficha-placa" className="mt-6">
                <FichaPlacaForm
                  loteId={activeSession.lote_id}
                  rodoviaId={activeSession.rodovia_id}
                />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <SessionSelector userId={user?.id} onSessionStarted={handleSessionStarted} />
        )}
      </main>

      <footer className="bg-background border-t mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-center gap-4">
            <img src={logoGoverno} alt="Governo Federal - Ministério dos Transportes" className="h-16 object-contain" />
            <p className="text-sm text-muted-foreground text-center">
              Críticas e sugestões: <a href="mailto:cassia.sampaio@dnit.gov.br" className="text-primary hover:underline">cassia.sampaio@dnit.gov.br</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
