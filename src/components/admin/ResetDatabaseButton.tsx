import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { resetDatabase } from "@/lib/resetDatabase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ResetDatabaseButton() {
  const [isResetting, setIsResetting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleReset = async () => {
    if (confirmText !== "APAGAR TUDO") {
      toast.error("Digite 'APAGAR TUDO' para confirmar");
      return;
    }

    setIsResetting(true);
    
    try {
      toast.loading("Apagando todos os dados...", { id: "reset" });
      
      await resetDatabase();
      
      toast.success("Banco de dados resetado com sucesso! Recarregue a página.", { 
        id: "reset",
        duration: 5000 
      });
      
      // Aguardar 2 segundos antes de recarregar
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error("Erro ao resetar banco:", error);
      toast.error("Erro ao resetar banco de dados", { id: "reset" });
    } finally {
      setIsResetting(false);
      setConfirmText("");
    }
  };

  return (
    <Card className="p-6 border-destructive">
      <div className="flex items-start gap-4">
        <AlertTriangle className="h-6 w-6 text-destructive mt-1" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-destructive mb-2">
            Zona de Perigo - Reset Completo
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Esta ação irá apagar <strong>TODOS</strong> os dados do sistema de forma permanente e irreversível:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 mb-4 list-disc list-inside">
            <li>Todos os usuários (exceto admins)</li>
            <li>Todas as fichas de cadastro</li>
            <li>Todas as intervenções e históricos</li>
            <li>Todas as não-conformidades</li>
            <li className="line-through opacity-50">Todos os lotes e rodovias (preservados)</li>
            <li className="line-through opacity-50">Atribuições de coordenadores (preservadas)</li>
            <li>Todas as fotos armazenadas</li>
          </ul>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={isResetting}
                className="w-full sm:w-auto"
              >
                {isResetting ? "Apagando..." : "Resetar Banco de Dados"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>⚠️ Confirmação Final</AlertDialogTitle>
                <AlertDialogDescription className="space-y-4">
                  <p>
                    Esta ação é <strong>IRREVERSÍVEL</strong> e apagará todos os dados do sistema.
                  </p>
                  <p>
                    Para confirmar, digite <strong>APAGAR TUDO</strong> no campo abaixo:
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Digite: APAGAR TUDO"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmText("")}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReset}
                  disabled={confirmText !== "APAGAR TUDO"}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Confirmar Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Card>
  );
}
