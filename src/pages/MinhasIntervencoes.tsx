import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
const logoOperaVia = "/logo-operavia.png";
import IntervencoesExecucaoMarcasSHContent from "@/components/intervencoes/execucao/IntervencoesExecucaoMarcasSHContent";
import IntervencoesExecucaoPlacasSVContent from "@/components/intervencoes/execucao/IntervencoesExecucaoPlacasSVContent";
import IntervencoesExecucaoInscricoesContent from "@/components/intervencoes/execucao/IntervencoesExecucaoInscricoesContent";
import IntervencoesExecucaoTachasContent from "@/components/intervencoes/execucao/IntervencoesExecucaoTachasContent";
import IntervencoesExecucaoCilindrosContent from "@/components/intervencoes/execucao/IntervencoesExecucaoCilindrosContent";
import IntervencoesExecucaoPorticosContent from "@/components/intervencoes/execucao/IntervencoesExecucaoPorticosContent";
import IntervencoesExecucaoDefensasContent from "@/components/intervencoes/execucao/IntervencoesExecucaoDefensasContent";
import IntervencoesManutencaoContent from "@/components/IntervencoesManutencaoContent";

const MinhasIntervencoes = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "sh");

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
            <img src={logoOperaVia} alt="OperaVia" className="h-24 object-contain" />
            <Button variant="outline" size="sm" onClick={() => navigate("/modo-campo")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8 mb-6">
            <TabsTrigger value="sh">
              SH
            </TabsTrigger>
            <TabsTrigger value="sv">
              SV
            </TabsTrigger>
            <TabsTrigger value="inscricoes">
              Inscrições
            </TabsTrigger>
            <TabsTrigger value="tacha">
              Tachas
            </TabsTrigger>
            <TabsTrigger value="cilindros">
              Cilindros
            </TabsTrigger>
            <TabsTrigger value="porticos">
              Pórticos
            </TabsTrigger>
            <TabsTrigger value="defensas">
              Defensas
            </TabsTrigger>
            <TabsTrigger value="manutencoes" className="text-orange-600">
              🟠 Manutenções
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="sh">
            <IntervencoesExecucaoMarcasSHContent />
          </TabsContent>
          
          <TabsContent value="sv">
            <IntervencoesExecucaoPlacasSVContent />
          </TabsContent>
          
          <TabsContent value="inscricoes">
            <IntervencoesExecucaoInscricoesContent />
          </TabsContent>
          
          <TabsContent value="tacha">
            <IntervencoesExecucaoTachasContent />
          </TabsContent>
          
          <TabsContent value="cilindros">
            <IntervencoesExecucaoCilindrosContent />
          </TabsContent>
          
          <TabsContent value="porticos">
            <IntervencoesExecucaoPorticosContent />
          </TabsContent>
          
          <TabsContent value="defensas">
            <IntervencoesExecucaoDefensasContent />
          </TabsContent>
          
          <TabsContent value="manutencoes">
            <IntervencoesManutencaoContent />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MinhasIntervencoes;
