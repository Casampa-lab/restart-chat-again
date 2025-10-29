import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "@/contexts/SessionContext";
import { useNetwork } from "@/contexts/NetworkContext";
import Header from "@/components/Header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const location = useLocation();
  const supabase = useSupabaseClient();
  const { user, signOut, authLoading } = useAuth();
  const { sessionLoading, refreshSession } = useSession();
  const { isOnline } = useNetwork();
  const [isAdminOrCoordinator, setIsAdminOrCoordinator] = useState(false);

  // 🔹 Verifica papel do usuário (Admin / Coordenador)
  useEffect(() => {
    if (!user) return;
    const checkAdminOrCoordinator = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "coordenador"])
        .maybeSingle();

      setIsAdminOrCoordinator(!!data);
    };
    checkAdminOrCoordinator();
  }, [user, supabase]);

  const handleSessionStarted = () => {
    refreshSession();
  };

  // 🔹 Patch mínimo de redirecionamento (mantém o fluxo correto do modo campo)
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
      return;
    }
    if (!user) return;

    const modoAtual = localStorage.getItem("modoAcesso"); // 'campo' | 'web' | null
    const pathname = location.pathname;

    // ✅ Evita loop: só redireciona se estiver no modo campo e ainda não estiver em /modo-campo
    if (modoAtual === "campo" && !pathname.startsWith("/modo-campo")) {
      navigate("/modo-campo", { replace: true });
      return;
    }

    // ✅ Define "web" como padrão apenas se não houver modo definido
    if (!modoAtual) {
      localStorage.setItem("modoAcesso", "web");
    }

    // ✅ Mantém limpeza leve
    sessionStorage.removeItem("vableCardHidden");
  }, [user, authLoading, location.pathname, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      // Redirecionamento automático controlado pelo useEffect
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      navigate("/auth", { replace: true });
    }
  };

  if (authLoading || sessionLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Header onSessionStart={handleSessionStarted} onSignOut={handleSignOut} />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/modo-campo")}>
          <CardHeader>
            <CardTitle>Modo Campo</CardTitle>
            <CardDescription>Registrar intervenções e ações de manutenção.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="default">Acessar</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/modo-web")}>
          <CardHeader>
            <CardTitle>Modo Web</CardTitle>
            <CardDescription>Visualizar inventário e relatórios de campo.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="default">Acessar</Button>
          </CardContent>
        </Card>

        {isAdminOrCoordinator && (
          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/painel-admin")}>
            <CardHeader>
              <CardTitle>Área Administrativa</CardTitle>
              <CardDescription>Gerenciar usuários e permissões do sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">Abrir Painel</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {!isOnline && (
        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
          ⚠️ Você está offline. Algumas funções podem estar indisponíveis.
        </div>
      )}
    </div>
  ); // ✅ fecha corretamente o return
} // ✅ fecha corretamente o componente
