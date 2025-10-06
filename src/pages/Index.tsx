import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkSession } from "@/hooks/useWorkSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, MapPin, Briefcase } from "lucide-react";
import SessionSelector from "@/components/SessionSelector";
import NaoConformidadeForm from "@/components/NaoConformidadeForm";
import logoBrLegal from "@/assets/logo-brlegal2.png";
import logoGoverno from "@/assets/logo-governo.png";
import logoConsol from "@/assets/logo-consol.jpg";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { activeSession, loading: sessionLoading } = useWorkSession(user?.id);

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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <img src={logoBrLegal} alt="BR-LEGAL 2" className="h-12 object-contain" />
              <img src={logoGoverno} alt="Governo Federal" className="h-10 object-contain hidden sm:block" />
            </div>
            <div className="flex items-center gap-4">
              <img src={logoConsol} alt="Consol Engenheiros" className="h-10 object-contain hidden md:block" />
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {activeSession ? (
          <>
            <Card className="bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Sessão de Trabalho Ativa
                </CardTitle>
                <CardDescription className="text-primary-foreground/80">
                  Seus dados estão sendo coletados para este lote e rodovia
                </CardDescription>
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
                    {activeSession.rodovia?.codigo} - {activeSession.rodovia?.nome}
                  </span>
                </div>
              </CardContent>
            </Card>

            <NaoConformidadeForm
              loteId={activeSession.lote_id}
              rodoviaId={activeSession.rodovia_id}
            />
          </>
        ) : (
          <SessionSelector userId={user?.id} />
        )}
      </main>
    </div>
  );
};

export default Index;
