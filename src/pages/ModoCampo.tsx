import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Map, Wrench, AlertTriangle, Search, ChevronRight, ArrowLeft } from "lucide-react";
import { useWorkSession } from "@/hooks/useWorkSession";
import { useAuth } from "@/hooks/useAuth";
import { SessionManagerMobile } from "@/components/SessionManagerMobile";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { useIOSDetection } from "@/hooks/useIOSDetection";
import SessionSelector from "@/components/SessionSelector";

export default function ModoCampo() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { activeSession, refreshSession } = useWorkSession(user?.id);
  const { isModernIOS } = useIOSDetection();

  // Salvar que o usuário está no modo campo
  useEffect(() => {
    localStorage.setItem("modoAcesso", "campo");
    localStorage.setItem("lastRoute", "/modo-campo");
  }, []);

  // Garantir que modo campo está ativo para iOS
  useEffect(() => {
    const modoAtual = localStorage.getItem("modoAcesso");

    // Se for iOS, sempre forçar modo campo
    if (isModernIOS && modoAtual !== "campo") {
      localStorage.setItem("modoAcesso", "campo");
    }
  }, [isModernIOS]);

  const handleVoltar = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await CapApp.minimizeApp();
      } catch (error) {
        console.error("Erro ao minimizar app:", error);
        await signOut();
        navigate("/auth");
      }
    } else {
      const confirmLogout = window.confirm("Deseja sair do modo campo? Você será deslogado do sistema.");

      if (confirmLogout) {
        await signOut();
        navigate("/auth");
      }
    }
  };

  const menuItems = [
    {
      icon: Wrench,
      title: "Ações de Campo",
      description: "Manutenção IN-3 ou Execução de Projeto",
      path: "/modo-campo/escolher-elemento", // ← em vez de /registrar-intervencao
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },

    {
      icon: Search,
      title: "Controle de Qualidade",
      description: "Fichas de verificação e retrorefletividade",
      path: "/minhas-fichas-verificacao",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleVoltar} className="h-12 w-12">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Modo Campo</h1>
            <p className="text-sm text-muted-foreground">Operações em campo otimizadas para mobile</p>
          </div>
        </div>

        {/* Sessão Ativa */}
        {activeSession ? (
          <SessionManagerMobile userId={user?.id!} activeSession={activeSession} onSessionChanged={refreshSession} />
        ) : (
          <SessionSelector userId={user?.id} onSessionStarted={refreshSession} />
        )}

        {/* Menu de Opções */}
        <div className="space-y-3">
          {menuItems.map((item) => (
            <Card
              key={item.path}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => navigate(item.path)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-xl ${item.bgColor}`}>
                    <item.icon className={`h-8 w-8 ${item.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <ChevronRight className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Informações */}
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            <p>🧭 GPS ativo • 📸 Câmera disponível • 📶 Online</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
