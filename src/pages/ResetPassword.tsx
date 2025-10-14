import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import logoOperaVia from "@/assets/logo-operavia.jpg";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Verificar se há um hash de recuperação de senha na URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    
    if (type !== 'recovery') {
      toast.error("Link de recuperação inválido");
      navigate("/auth");
    }
  }, [navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Senha alterada com sucesso! Faça login com sua nova senha.");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-primary/10 to-secondary/10 overflow-y-auto">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-3">
          <div className="flex flex-col items-center gap-2 bg-card rounded-xl p-8 shadow-lg">
            <img src={logoOperaVia} alt="OperaVia" className="h-48 w-48 object-contain" />
          </div>
          
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Redefinir Senha</CardTitle>
              <CardDescription className="text-center">
                Digite sua nova senha
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input 
                    id="newPassword" 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    required 
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required 
                    minLength={6}
                    placeholder="Digite a senha novamente"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      <span>Processando...</span>
                    </div>
                  ) : (
                    "Alterar Senha"
                  )}
                </Button>
              </form>
              <div className="mt-4 text-center text-sm">
                <button 
                  onClick={() => navigate("/auth")} 
                  className="text-primary hover:underline font-medium"
                >
                  Voltar para login
                </button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card shadow-lg border-primary/20">
            <CardContent className="py-4">
              <p className="text-sm text-center">
                <span className="font-semibold text-foreground">Contato:</span>{" "}
                <a 
                  href="mailto:contato@operavia.online" 
                  className="text-primary hover:underline font-medium"
                >
                  contato@operavia.online
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
