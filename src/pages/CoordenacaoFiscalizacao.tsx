import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download } from "lucide-react";
import { BarChart3, FileSpreadsheet } from "lucide-react";
import {
  exportFrentesLiberadas,
  exportNaoConformidades,
  exportRetrorrefletividadeEstaticaHorizontal,
  exportRetrorrefletividadeEstaticaVertical,
  exportRetrorrefletividadeDinamica,
  exportDefensas,
  exportIntervencoesSH,
  exportIntervencoesInscricoes,
  exportIntervencoesSV,
  exportIntervencoesTacha,
  exportFichasVerificacao,
  exportFichasPlaca,
  exportRegistroNC
} from "@/lib/excelExport";
import { toast } from "sonner";
import logoOperaVia from "@/assets/logo-operavia.jpg";


const CoordenacaoFiscalizacao = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isAdminOrCoordinator, setIsAdminOrCoordinator] = useState(false);

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
                className="h-20 object-contain cursor-pointer hover:scale-105 transition-transform" 
                onClick={() => navigate("/")}
              />
            </div>
            <Button 
              variant="default" 
              size="lg"
              onClick={() => navigate("/")}
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
          <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardTitle className="text-3xl text-primary">Gestão</CardTitle>
            <CardDescription className="text-lg">
              Acesse todas as listagens e registros do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {isAdminOrCoordinator && (
              <div className="mb-6 flex justify-center">
                <Button
                  size="lg"
                  variant="default"
                  className="font-semibold text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={() => navigate("/elementos-pendentes")}
                >
                  <FileSpreadsheet className="mr-2 h-6 w-6" />
                  Elementos Pendentes de Aprovação
                </Button>
              </div>
            )}
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
                <div className="text-center py-8 space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Planilha 2.2 - Frente Liberada</h3>
                    <div className="flex gap-4 justify-center">
                      <Button 
                        size="lg"
                        variant="default"
                        className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow"
                        onClick={() => navigate("/minhas-frentes-liberadas")}
                      >
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
                    <p className="text-sm text-muted-foreground">
                      Visualize e baixe as frentes liberadas registradas
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ncs-lote" className="mt-6">
                <div className="text-center py-8 space-y-4">
                  <Button 
                    size="lg"
                    variant="default"
                    className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow"
                    onClick={() => navigate("/ncs-coordenador")}
                  >
                    Acessar NCs por Lote
                  </Button>
                  <Button 
                    size="lg"
                    variant="secondary"
                    className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow ml-4"
                    onClick={() => handleDownload('ncs')}
                  >
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
                    <Button 
                      size="lg"
                      variant="default"
                      className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow"
                      onClick={() => navigate("/minhas-retrorrefletividades")}
                    >
                      Estática
                    </Button>
                    <Button 
                      size="lg"
                      variant="default"
                      className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow"
                      onClick={() => navigate("/minhas-retrorrefletividades-dinamicas")}
                    >
                      Dinâmica
                    </Button>
                  </div>
                  <Button 
                    size="lg"
                    variant="secondary"
                    className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow"
                    onClick={async () => {
                      await handleDownload('retro-estatica-horizontal');
                      await handleDownload('retro-estatica-vertical');
                      await handleDownload('retro-dinamica');
                    }}
                  >
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
                  <Button 
                    size="lg"
                    variant="default"
                    className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow"
                    onClick={() => navigate("/minhas-defensas")}
                  >
                    Visualizar Defensas
                  </Button>
                  <Button 
                    size="lg"
                    variant="secondary"
                    className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow ml-4"
                    onClick={() => handleDownload('defensas')}
                  >
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
                    <Button 
                      size="lg"
                      variant="default"
                      className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow"
                      onClick={() => navigate("/minhas-intervencoes-sh")}
                    >
                      SH
                    </Button>
                    <Button 
                      size="lg"
                      variant="default"
                      className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow"
                      onClick={() => navigate("/minhas-intervencoes-inscricoes")}
                    >
                      Inscrições
                    </Button>
                    <Button 
                      size="lg"
                      variant="default"
                      className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow"
                      onClick={() => navigate("/minhas-intervencoes-sv")}
                    >
                      SV
                    </Button>
                    <Button 
                      size="lg"
                      variant="default"
                      className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow"
                      onClick={() => navigate("/minhas-intervencoes-tacha")}
                    >
                      Tachas
                    </Button>
                  </div>
                  <Button 
                    size="lg"
                    variant="secondary"
                    className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow"
                    onClick={async () => {
                      await handleDownload('int-sh');
                      await handleDownload('int-inscricoes');
                      await handleDownload('int-sv');
                      await handleDownload('int-tacha');
                    }}
                  >
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
                    <Button 
                      size="lg"
                      variant="default"
                      className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow"
                      onClick={() => navigate("/minhas-fichas-verificacao")}
                    >
                      Verificação
                    </Button>
                    <Button 
                      size="lg"
                      variant="default"
                      className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow"
                      onClick={() => navigate("/minhas-fichas-placa")}
                    >
                      Placa
                    </Button>
                    <Button 
                      size="lg"
                      variant="default"
                      className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow"
                      onClick={() => navigate("/meus-registros-nc")}
                    >
                      Registro NC
                    </Button>
                  </div>
                  <Button 
                    size="lg"
                    variant="secondary"
                    className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow"
                    onClick={async () => {
                      await handleDownload('fichas-verificacao');
                      await handleDownload('fichas-placa');
                      await handleDownload('registro-nc');
                    }}
                  >
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
                    <Button 
                      size="lg"
                      variant="default"
                      className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow"
                      onClick={() => navigate("/dashboard-necessidades")}
                    >
                      <BarChart3 className="mr-2 h-5 w-5" />
                      Dashboard
                    </Button>
                    <Button 
                      size="lg"
                      variant="secondary"
                      className="font-semibold text-lg px-8 shadow-md hover:shadow-lg transition-shadow"
                      onClick={() => navigate("/minhas-necessidades-relatorios")}
                    >
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
              Críticas e sugestões: <a href="mailto:operavia.online@gmail.com" className="text-primary hover:underline">operavia.online@gmail.com</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CoordenacaoFiscalizacao;
