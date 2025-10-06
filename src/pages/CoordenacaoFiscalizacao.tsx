import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import logoBrLegal from "@/assets/logo-brlegal2.png";
import logoGoverno from "@/assets/logo-governo.png";

const CoordenacaoFiscalizacao = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

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

  if (authLoading) {
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
            <img 
              src={logoBrLegal} 
              alt="BR-LEGAL 2" 
              className="h-16 object-contain cursor-pointer hover:scale-105 transition-transform" 
              onClick={() => navigate("/")}
            />
            <Button 
              variant="navigation" 
              size="lg"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Voltar
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <Card className="shadow-elevated border-2 border-primary/20">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardTitle className="text-3xl text-primary">Coordenação e Fiscalização</CardTitle>
            <CardDescription className="text-lg">
              Acesse todas as listagens e registros do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="ncs-lote" className="w-full">
              <TabsList className="grid w-full grid-cols-1 gap-2 h-auto bg-muted p-2">
                <TabsTrigger value="ncs-lote" className="whitespace-normal py-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold text-sm">
                  NCs por Lote
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ncs-lote" className="mt-6">
                <div className="text-center py-8">
                  <Button 
                    size="lg"
                    className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow"
                    onClick={() => navigate("/ncs-coordenador")}
                  >
                    Acessar NCs por Lote
                  </Button>
                  <p className="text-muted-foreground mt-4">
                    Visualize e gerencie todas as não conformidades organizadas por lote
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
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

export default CoordenacaoFiscalizacao;
