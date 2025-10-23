import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from "lucide-react";
import { ModulosStatus } from "@/components/ModulosStatus";
import logoOperaVia from "@/assets/logo-operavia.png";


const Modulos = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <header className="bg-primary shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/95 rounded-lg px-3 py-2 shadow-md">
                <img 
                  src={logoOperaVia} 
                  alt="OperaVia - Sistema de Supervisão de Operação Rodoviária" 
                  className="h-24 object-contain cursor-pointer hover:scale-105 transition-transform" 
                  onClick={() => navigate("/")}
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary-foreground">Módulos do Sistema</h1>
                <p className="text-sm text-primary-foreground/80">Funcionalidades Disponíveis</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="default" 
                size="lg"
                onClick={() => navigate("/")}
                className="font-semibold shadow-md hover:shadow-lg transition-shadow bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Voltar
              </Button>
              <Button 
                variant="destructive" 
                size="lg"
                onClick={handleSignOut}
                className="font-semibold shadow-md hover:shadow-lg transition-shadow"
              >
                <LogOut className="mr-2 h-5 w-5" />
                SAIR
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <ModulosStatus />
      </main>

      <footer className="bg-background border-t mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Sistema de Supervisão Rodoviária - Gestão Integrada
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Modulos;
