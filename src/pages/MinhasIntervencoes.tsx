import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import logoOperaVia from "@/assets/logo-operavia.jpg";

const MinhasIntervencoes = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("sh");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
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
            <img src={logoOperaVia} alt="OperaVia" className="h-16 object-contain" />
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
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
          
          <TabsContent value="sh">
            <iframe 
              src="/minhas-intervencoes-sh" 
              className="w-full h-[calc(100vh-200px)] border-0"
              title="Intervenções SH"
            />
          </TabsContent>
          
          <TabsContent value="inscricoes">
            <iframe 
              src="/minhas-intervencoes-inscricoes" 
              className="w-full h-[calc(100vh-200px)] border-0"
              title="Intervenções Inscrições"
            />
          </TabsContent>
          
          <TabsContent value="sv">
            <iframe 
              src="/minhas-intervencoes-sv" 
              className="w-full h-[calc(100vh-200px)] border-0"
              title="Intervenções SV"
            />
          </TabsContent>
          
          <TabsContent value="tacha">
            <iframe 
              src="/minhas-intervencoes-tacha" 
              className="w-full h-[calc(100vh-200px)] border-0"
              title="Intervenções Tacha"
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MinhasIntervencoes;
