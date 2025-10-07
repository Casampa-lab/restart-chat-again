import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import EmpresasManager from "@/components/admin/EmpresasManager";
import LotesManager from "@/components/admin/LotesManager";
import RodoviasManager from "@/components/admin/RodoviasManager";
import { DestinatariosManager } from "@/components/admin/DestinatariosManager";
import { CoordinatorAssignmentsManager } from "@/components/admin/CoordinatorAssignmentsManager";
import { AssinaturasManager } from "@/components/admin/AssinaturasManager";

import logoConsol from "@/assets/logo-consol.jpg";

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        navigate("/auth");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          toast.error("Acesso negado. Apenas administradores podem acessar esta área.");
          navigate("/");
          return;
        }

        setIsAdmin(true);
      } catch (error: any) {
        toast.error("Erro ao verificar permissões: " + error.message);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 to-secondary/5">
      <header className="bg-primary shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/95 rounded-lg px-3 py-2 shadow-md">
                <img 
                  src={logoConsol} 
                  alt="Sistema de Supervisão" 
                  className="h-16 object-contain cursor-pointer hover:scale-105 transition-transform" 
                  onClick={() => navigate("/")}
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary-foreground">Painel Administrativo</h1>
                <p className="text-sm text-primary-foreground/80">Gestão de Assinaturas e Configurações</p>
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
        <Tabs defaultValue="empresas" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="empresas">Empresas</TabsTrigger>
            <TabsTrigger value="lotes">Lotes</TabsTrigger>
            <TabsTrigger value="rodovias">Rodovias</TabsTrigger>
            <TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>
            <TabsTrigger value="coordinators">Coordenadores</TabsTrigger>
            <TabsTrigger value="destinatarios">Emails</TabsTrigger>
          </TabsList>

          <TabsContent value="empresas">
            <EmpresasManager />
          </TabsContent>

          <TabsContent value="lotes">
            <LotesManager />
          </TabsContent>

          <TabsContent value="rodovias">
            <RodoviasManager />
          </TabsContent>

          <TabsContent value="assinaturas">
            <AssinaturasManager />
          </TabsContent>

          <TabsContent value="coordinators">
            <CoordinatorAssignmentsManager />
          </TabsContent>

          <TabsContent value="destinatarios">
            <DestinatariosManager />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="bg-background border-t mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Críticas e sugestões: <a href="mailto:cassia.sampaio@dnit.gov.br" className="text-primary hover:underline">cassia.sampaio@dnit.gov.br</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Admin;
