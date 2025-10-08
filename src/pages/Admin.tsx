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

import logoOperaVia from "@/assets/logo-operavia.jpg";

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: supervisora } = useSupervisora();
  const [isAdminOrCoordinator, setIsAdminOrCoordinator] = useState(false);
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
    : "OperaVia - Sistema Nacional de Supervisão de Operação Rodoviária";

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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="supervisoras">Supervisoras</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="empresas">Executoras</TabsTrigger>
            <TabsTrigger value="lotes">Lotes</TabsTrigger>
            <TabsTrigger value="rodovias">Rodovias</TabsTrigger>
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
        </Tabs>
      </main>

      <footer className="bg-background border-t mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Críticas e sugestões: <a href="mailto:operavia.online@gmail.com" className="text-primary hover:underline">operavia.online@gmail.com</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Admin;
