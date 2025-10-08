import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function ResetAdminPassword() {
  const [email, setEmail] = useState("admin@operavia.online");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('reset-admin-password', {
        body: { email, newPassword }
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Senha resetada com sucesso. Faça login com a nova senha.",
      });

      setNewPassword("");
    } catch (error: any) {
      toast({
        title: "Erro ao resetar senha",
        description: error.message || "Ocorreu um erro ao resetar a senha",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Resetar Senha do Administrador</CardTitle>
          <CardDescription>
            Digite a nova senha para o administrador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@operavia.online"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nova Senha</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Resetando..." : "Resetar Senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
