import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSupervisora } from "@/hooks/useSupervisora";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import EmpresasManager from "@/components/admin/EmpresasManager";
import LotesManager from "@/components/admin/LotesManager";
import RodoviasManager from "@/components/admin/RodoviasManager";
import { SupervisorasManager } from "@/components/admin/SupervisorasManager";
import { UsuariosManager } from "@/components/admin/UsuariosManager";
import { InventarioImporterManager } from "@/components/admin/InventarioImporterManager";
import { DeleteInventarioSelecionado } from "@/components/admin/DeleteInventarioSelecionado";
import { RemoverDuplicatasInventario } from "@/components/admin/RemoverDuplicatasInventario";
import { LimparFotosOrfas } from "@/components/admin/LimparFotosOrfas";
import { NecessidadesImporter } from "@/components/admin/NecessidadesImporter";
import { NecessidadesAuditor } from "@/components/admin/NecessidadesAuditor";
import { DeleteNecessidades } from "@/components/admin/DeleteNecessidades";
import { DiagnosticoMatch } from "@/components/admin/DiagnosticoMatch";
import { RecalcularMatches } from "@/components/admin/RecalcularMatches";
import { LimparReconciliacoesInconsistentes } from "@/components/admin/LimparReconciliacoesInconsistentes";
import { ResetDatabaseButton } from "@/components/admin/ResetDatabaseButton";

import logoOperaVia from "@/assets/logo-operavia.jpg";

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: supervisora } = useSupervisora();
  const [isAdminOrCoordinator, setIsAdminOrCoordinator] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

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
        <Tabs defaultValue="supervisoras" className="w-full">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-9' : 'grid-cols-7'}`}>
            <TabsTrigger value="supervisoras">Supervisoras</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="empresas">Executoras</TabsTrigger>
            <TabsTrigger value="lotes">Lotes</TabsTrigger>
            <TabsTrigger value="rodovias">Rodovias</TabsTrigger>
            <TabsTrigger value="inventario">Cadastro</TabsTrigger>
            <TabsTrigger value="necessidades">Projeto</TabsTrigger>
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
              <InventarioImporterManager />
              <DeleteInventarioSelecionado />
              <RemoverDuplicatasInventario />
              <LimparFotosOrfas />
            </div>
          </TabsContent>

          <TabsContent value="necessidades">
            <div className="space-y-6">
              <NecessidadesImporter />
              <RecalcularMatches />
              <DiagnosticoMatch />
              <NecessidadesAuditor />
              <DeleteNecessidades />
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="auditoria">
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Clique no botão abaixo para acessar o painel completo de Auditoria de Sinalizações GPS
                </p>
                <Button 
                  size="lg"
                  onClick={() => navigate("/admin/auditoria-sinalizacoes")}
                >
                  Abrir Painel de Auditoria GPS
                </Button>
              </div>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="sistema">
              <div className="space-y-6">
                <LimparReconciliacoesInconsistentes />
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
