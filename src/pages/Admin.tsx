import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { useSupervisora } from "@/hooks/useSupervisora";
import { useWorkSession } from "@/hooks/useWorkSession";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import EmpresasManager from "@/components/admin/EmpresasManager";
import LotesManager from "@/components/admin/LotesManager";
import RodoviasManager from "@/components/admin/RodoviasManager";
import { SupervisorasManager } from "@/components/admin/SupervisorasManager";
import { UsuariosManager } from "@/components/admin/UsuariosManager";
import { InventarioImporterManager } from "@/components/admin/InventarioImporterManager";
import { DeleteInventarioSelecionado } from "@/components/admin/DeleteInventarioSelecionado";
import { RemoverDuplicatasInventario } from "@/components/admin/RemoverDuplicatasInventario";
import { NecessidadesImporter } from "@/components/admin/NecessidadesImporter";
import { DeleteNecessidades } from "@/components/admin/DeleteNecessidades";
import { DeleteTodasNecessidades } from "@/components/admin/DeleteTodasNecessidades";
import { RemoverDuplicatasNecessidades } from "@/components/admin/RemoverDuplicatasNecessidades";

import { LimparReconciliacoesInconsistentes } from "@/components/admin/LimparReconciliacoesInconsistentes";
import { LimparReconciliacoesOrfas } from "@/components/admin/LimparReconciliacoesOrfas";
import { DiagnosticoMatch } from "@/components/admin/DiagnosticoMatch";
import { LimparFotosOrfas } from "@/components/admin/LimparFotosOrfas";
import { SnvShapefileUploader } from "@/components/admin/SnvShapefileUploader";
import { ResetDatabaseButton } from "@/components/admin/ResetDatabaseButton";
import { ParametrosMatchManager } from "@/components/admin/ParametrosMatchManager";
import { RelatorioMatching } from "@/components/admin/RelatorioMatching";
import { ExecutarMatching } from "@/components/admin/ExecutarMatching";
import { LimparResultadosMatching } from "@/components/admin/LimparResultadosMatching";
import { DeletarImportacaoPorLote } from "@/components/admin/DeletarImportacaoPorLote";
import { AuditoriaImportacoes } from "@/components/admin/AuditoriaImportacoes";
import { GestaoConflitos } from "@/components/admin/GestaoConflitos";

import logoOperaVia from "@/assets/logo-operavia.png";

const Admin = () => {
  const navigate = useNavigate();
  const { navigateBack } = useNavigationContext();
  const { user, loading: authLoading } = useAuth();
  const { data: supervisora } = useSupervisora();
  const { activeSession } = useWorkSession(user?.id);
  const [isAdminOrCoordinator, setIsAdminOrCoordinator] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedLoteId, setSelectedLoteId] = useState<string>("");
  const [selectedRodoviaId, setSelectedRodoviaId] = useState<string>("");

  // Buscar lotes
  const { data: lotes } = useQuery({
    queryKey: ["admin-lotes"],
    queryFn: async () => {
      const { data } = await supabase.from("lotes").select("*").order("numero");
      return data || [];
    },
  });

  // Buscar rodovias do lote selecionado
  const { data: rodovias } = useQuery({
    queryKey: ["admin-rodovias", selectedLoteId],
    queryFn: async () => {
      if (!selectedLoteId) return [];
      const { data } = await supabase
        .from("lotes_rodovias")
        .select("rodovia:rodovias(*)")
        .eq("lote_id", selectedLoteId);
      return data?.map(lr => lr.rodovia) || [];
    },
    enabled: !!selectedLoteId,
  });

  useEffect(() => {
    const checkAdminOrCoordinator = async () => {
      if (!user) {
        navigate("/auth");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "coordenador"])
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          toast.error("Acesso negado. Apenas administradores e coordenadores podem acessar esta área.");
          navigate("/");
          return;
        }

        setIsAdminOrCoordinator(true);
        
        // Verificar se é especificamente admin para a aba de Auditoria GPS
        if (data.role === "admin") {
          setIsAdmin(true);
        }
      } catch (error: any) {
        toast.error("Erro ao verificar permissões: " + error.message);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkAdminOrCoordinator();
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

  // Preencher automaticamente lote e rodovia com base na sessão ativa
  useEffect(() => {
    if (activeSession?.lote_id && activeSession?.rodovia_id) {
      setSelectedLoteId(activeSession.lote_id);
      setSelectedRodoviaId(activeSession.rodovia_id);
    }
  }, [activeSession]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdminOrCoordinator) {
    return null;
  }

  // Determinar qual logo usar
  const logoToDisplay = supervisora?.usar_logo_customizado && supervisora?.logo_url 
    ? supervisora.logo_url 
    : logoOperaVia;
  const logoAlt = supervisora?.usar_logo_customizado && supervisora?.logo_url
    ? `${supervisora.nome_empresa} - Sistema de Supervisão`
    : "OperaVia - Sistema de Supervisão de Operação Rodoviária";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 to-secondary/5">
      <header className="bg-primary shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
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
                <h1 className="text-xl font-bold text-primary-foreground">Painel Administrativo</h1>
                <p className="text-sm text-primary-foreground/80">Gestão de Empresas e Configurações</p>
              </div>
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
        <Tabs defaultValue="supervisoras" className="w-full">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-11' : 'grid-cols-9'}`}>
            <TabsTrigger value="supervisoras">Supervisoras</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="empresas">Executoras</TabsTrigger>
            <TabsTrigger value="lotes">Lotes</TabsTrigger>
            <TabsTrigger value="rodovias">Rodovias</TabsTrigger>
            <TabsTrigger value="inventario">Cadastro</TabsTrigger>
            <TabsTrigger value="necessidades">Projeto</TabsTrigger>
            <TabsTrigger value="matching">Matching</TabsTrigger>
            <TabsTrigger value="conflitos" className="text-orange-600">Conflitos ⚠️</TabsTrigger>
            {isAdmin && <TabsTrigger value="auditoria">Auditoria GPS</TabsTrigger>}
            {isAdmin && <TabsTrigger value="sistema" className="text-destructive">Sistema</TabsTrigger>}
          </TabsList>

          <TabsContent value="supervisoras">
            <SupervisorasManager />
          </TabsContent>

          <TabsContent value="usuarios">
            <UsuariosManager />
          </TabsContent>

          <TabsContent value="empresas">
            <EmpresasManager />
          </TabsContent>

          <TabsContent value="lotes">
            <LotesManager />
          </TabsContent>

          <TabsContent value="rodovias">
            <RodoviasManager />
          </TabsContent>

          <TabsContent value="inventario">
            <div className="space-y-6">
              {/* Card de Seleção de Contexto */}
              <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Contexto de Trabalho
                  </CardTitle>
                  <CardDescription>
                    Selecione o lote e rodovia para facilitar a gestão do cadastro
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Dropdown Lote */}
                    <div>
                      <Label htmlFor="cadastro-lote">Lote</Label>
                      <Select value={selectedLoteId} onValueChange={(value) => {
                        setSelectedLoteId(value);
                        setSelectedRodoviaId(""); // Reset rodovia ao trocar lote
                      }}>
                        <SelectTrigger id="cadastro-lote">
                          <SelectValue placeholder="Selecione o lote" />
                        </SelectTrigger>
                        <SelectContent>
                          {lotes?.map((lote) => (
                            <SelectItem key={lote.id} value={lote.id}>
                              Lote {lote.numero}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dropdown Rodovia */}
                    <div>
                      <Label htmlFor="cadastro-rodovia">Rodovia</Label>
                      <Select 
                        value={selectedRodoviaId} 
                        onValueChange={setSelectedRodoviaId}
                        disabled={!selectedLoteId}
                      >
                        <SelectTrigger id="cadastro-rodovia">
                          <SelectValue placeholder={selectedLoteId ? "Selecione a rodovia" : "Primeiro selecione o lote"} />
                        </SelectTrigger>
                        <SelectContent>
                          {rodovias?.map((rodovia: any) => (
                            <SelectItem key={rodovia.id} value={rodovia.id}>
                              {rodovia.codigo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Indicador visual */}
                  {selectedLoteId && selectedRodoviaId && (
                    <Alert className="mt-4 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        <strong>Contexto ativo:</strong> Lote {lotes?.find(l => l.id === selectedLoteId)?.numero} - {rodovias?.find((r: any) => r.id === selectedRodoviaId)?.codigo}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Componentes com props compartilhadas */}
              <InventarioImporterManager loteId={selectedLoteId} rodoviaId={selectedRodoviaId} />
              <DeleteInventarioSelecionado loteId={selectedLoteId} rodoviaId={selectedRodoviaId} />
              <LimparReconciliacoesOrfas />
            </div>
          </TabsContent>

          <TabsContent value="necessidades">
            <div className="space-y-6">
              {/* Card de Seleção de Contexto */}
              <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Contexto de Trabalho
                  </CardTitle>
                  <CardDescription>
                    Selecione o lote e rodovia para facilitar a gestão das necessidades
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Dropdown Lote */}
                    <div>
                      <Label htmlFor="admin-lote">Lote</Label>
                      <Select value={selectedLoteId} onValueChange={(value) => {
                        setSelectedLoteId(value);
                        setSelectedRodoviaId(""); // Reset rodovia ao trocar lote
                      }}>
                        <SelectTrigger id="admin-lote">
                          <SelectValue placeholder="Selecione o lote" />
                        </SelectTrigger>
                        <SelectContent>
                          {lotes?.map((lote) => (
                            <SelectItem key={lote.id} value={lote.id}>
                              Lote {lote.numero}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dropdown Rodovia */}
                    <div>
                      <Label htmlFor="admin-rodovia">Rodovia</Label>
                      <Select 
                        value={selectedRodoviaId} 
                        onValueChange={setSelectedRodoviaId}
                        disabled={!selectedLoteId}
                      >
                        <SelectTrigger id="admin-rodovia">
                          <SelectValue placeholder={selectedLoteId ? "Selecione a rodovia" : "Primeiro selecione o lote"} />
                        </SelectTrigger>
                        <SelectContent>
                          {rodovias?.map((rodovia: any) => (
                            <SelectItem key={rodovia.id} value={rodovia.id}>
                              {rodovia.codigo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Indicador visual */}
                  {selectedLoteId && selectedRodoviaId && (
                    <Alert className="mt-4 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        <strong>Contexto ativo:</strong> Lote {lotes?.find(l => l.id === selectedLoteId)?.numero} - {rodovias?.find((r: any) => r.id === selectedRodoviaId)?.codigo}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Componentes com props compartilhadas */}
              <NecessidadesImporter loteId={selectedLoteId} rodoviaId={selectedRodoviaId} />
              <DeletarImportacaoPorLote />
              <AuditoriaImportacoes />
              <DeleteTodasNecessidades loteId={selectedLoteId} rodoviaId={selectedRodoviaId} />
              <RemoverDuplicatasNecessidades />
              
              <DeleteNecessidades loteId={selectedLoteId} rodoviaId={selectedRodoviaId} />
            </div>
          </TabsContent>

          <TabsContent value="matching">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🗺️ Mapas de Necessidades - Elementos Pontuais
                  </CardTitle>
                  <CardDescription>
                    Visualize necessidades no mapa, ordenadas por KM (sem filtros de distância)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={() => navigate(`/mapa-necessidades-placas?rodovia=${selectedRodoviaId}&lote=${selectedLoteId}`)}
                    disabled={!selectedRodoviaId || !selectedLoteId}
                    className="w-full"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    🚏 Mapa de Placas
                  </Button>
                  <Button
                    onClick={() => navigate(`/mapa-necessidades-porticos?rodovia=${selectedRodoviaId}&lote=${selectedLoteId}`)}
                    disabled={!selectedRodoviaId || !selectedLoteId}
                    className="w-full"
                    variant="outline"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    🌉 Mapa de Pórticos
                  </Button>
                  <Button
                    onClick={() => navigate(`/mapa-necessidades-inscricoes?rodovia=${selectedRodoviaId}&lote=${selectedLoteId}`)}
                    disabled={!selectedRodoviaId || !selectedLoteId}
                    className="w-full"
                    variant="outline"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    ➡️ Mapa de Inscrições
                  </Button>
                  {(!selectedRodoviaId || !selectedLoteId) && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selecione uma rodovia e lote para visualizar os mapas
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📋 Listas de Necessidades - Elementos Lineares
                  </CardTitle>
                  <CardDescription>
                    Visualize necessidades lineares ordenadas por KM, com indicador de overlap
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={() => navigate(`/lista-necessidades-marcas?rodovia=${selectedRodoviaId}&lote=${selectedLoteId}`)}
                    disabled={!selectedRodoviaId || !selectedLoteId}
                    className="w-full"
                    variant="outline"
                  >
                    ➖ Lista de Marcas Longitudinais
                  </Button>
                  <Button
                    onClick={() => navigate(`/lista-necessidades-tachas?rodovia=${selectedRodoviaId}&lote=${selectedLoteId}`)}
                    disabled={!selectedRodoviaId || !selectedLoteId}
                    className="w-full"
                    variant="outline"
                  >
                    💎 Lista de Tachas Refletivas
                  </Button>
                  <Button
                    onClick={() => navigate(`/lista-necessidades-defensas?rodovia=${selectedRodoviaId}&lote=${selectedLoteId}`)}
                    disabled={!selectedRodoviaId || !selectedLoteId}
                    className="w-full"
                    variant="outline"
                  >
                    🛣️ Lista de Defensas Metálicas
                  </Button>
                  {(!selectedRodoviaId || !selectedLoteId) && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selecione uma rodovia e lote para visualizar as listas
                    </p>
                  )}
                </CardContent>
              </Card>
              
              <ExecutarMatching />
              <ParametrosMatchManager />
              <RelatorioMatching rodoviaId={selectedRodoviaId} loteId={selectedLoteId} />
              <LimparResultadosMatching />
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="auditoria" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>🔍 Auditoria de GPS</CardTitle>
                  <CardDescription>
                    Diagnóstico de registros com coordenadas ausentes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DiagnosticoMatch />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>🗺️ Gestão de Camada SNV</CardTitle>
                  <CardDescription>
                    Upload e conversão automática de shapefiles SNV para GeoJSON
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SnvShapefileUploader />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="conflitos">
            <div className="space-y-6">
              {/* Card de Seleção de Contexto */}
              <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Contexto de Trabalho
                  </CardTitle>
                  <CardDescription>
                    Selecione o lote e rodovia para visualizar conflitos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Dropdown Lote */}
                    <div>
                      <Label htmlFor="conflitos-lote">Lote</Label>
                      <Select value={selectedLoteId} onValueChange={(value) => {
                        setSelectedLoteId(value);
                        setSelectedRodoviaId("");
                      }}>
                        <SelectTrigger id="conflitos-lote">
                          <SelectValue placeholder="Selecione o lote" />
                        </SelectTrigger>
                        <SelectContent>
                          {lotes?.map((lote) => (
                            <SelectItem key={lote.id} value={lote.id}>
                              Lote {lote.numero}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dropdown Rodovia */}
                    <div>
                      <Label htmlFor="conflitos-rodovia">Rodovia</Label>
                      <Select 
                        value={selectedRodoviaId} 
                        onValueChange={setSelectedRodoviaId}
                        disabled={!selectedLoteId}
                      >
                        <SelectTrigger id="conflitos-rodovia">
                          <SelectValue placeholder={selectedLoteId ? "Selecione a rodovia" : "Primeiro selecione o lote"} />
                        </SelectTrigger>
                        <SelectContent>
                          {rodovias?.map((rodovia: any) => (
                            <SelectItem key={rodovia.id} value={rodovia.id}>
                              {rodovia.codigo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Indicador visual */}
                  {selectedLoteId && selectedRodoviaId && (
                    <Alert className="mt-4 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        <strong>Contexto ativo:</strong> Lote {lotes?.find(l => l.id === selectedLoteId)?.numero} - {rodovias?.find((r: any) => r.id === selectedRodoviaId)?.codigo}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Componente de Gestão de Conflitos */}
              <GestaoConflitos loteId={selectedLoteId} rodoviaId={selectedRodoviaId} />
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="sistema">
              <div className="space-y-6">
                <LimparReconciliacoesInconsistentes />
                <RemoverDuplicatasInventario />
                <ResetDatabaseButton />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>

      <footer className="bg-background border-t mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Críticas e sugestões: <a href="mailto:contato@operavia.online" className="text-primary hover:underline">contato@operavia.online</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Admin;
