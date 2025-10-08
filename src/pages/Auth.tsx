import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import logoOperaVia from "@/assets/logo-operavia.jpg";
const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [codigoConvite, setCodigoConvite] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    // Recuperar último email usado
    const lastEmail = localStorage.getItem("lastEmail");
    if (lastEmail) {
      setEmail(lastEmail);
    }
  }, []);
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkSession();

    // Listener apenas para mudanças de autenticação
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate("/");
      }
      // SIGNED_OUT não precisa fazer nada - usuário já está em /auth
    });

    // Inicializar admin na primeira vez
    const initAdmin = async () => {
      try {
        await supabase.functions.invoke('init-admin');
      } catch (error) {
        // Silenciar erro - admin pode já existir
        console.log('Admin initialization:', error);
      }
    };
    initAdmin();
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const {
          error
        } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        localStorage.setItem("lastEmail", email);
        toast.success("Login realizado com sucesso!");
        navigate("/");
      } else {
        const {
          error
        } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              nome: nome,
              codigo_convite: codigoConvite || undefined
            }
          }
        });
        if (error) throw error;
        localStorage.setItem("lastEmail", email);
        toast.success("Conta criada! Faça login para continuar.");
        setIsLogin(true);
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };
  return <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4 overflow-y-auto">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <img src={logoOperaVia} alt="OperaVia" className="h-20 object-contain" />
        </div>
        
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl text-center"></CardTitle>
            <CardDescription className="text-center">
              Sistema Nacional de Supervisão de Operação Rodoviária
            </CardDescription>
            <CardDescription className="text-center">
              {isLogin ? "Entre com suas credenciais" : "Crie sua conta"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && <>
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input id="nome" type="text" placeholder="Seu nome" value={nome} onChange={e => setNome(e.target.value)} required={!isLogin} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="codigo">Código de Convite (opcional)</Label>
                    <Input id="codigo" type="text" placeholder="Ex: ABC12345" value={codigoConvite} onChange={e => setCodigoConvite(e.target.value.toUpperCase())} maxLength={8} />
                    <p className="text-xs text-muted-foreground">
                      Se você recebeu um código da sua supervisora, digite aqui.
                    </p>
                  </div>
                </>}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                {!isLogin && <p className="text-xs text-muted-foreground">
                    Mínimo de 6 caracteres.
                  </p>}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Processando..." : isLogin ? "Entrar" : "Cadastrar"}
              </Button>

              <Button type="button" variant="ghost" className="w-full" onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre"}
              </Button>

              {isLogin && <Button type="button" variant="link" className="w-full text-sm text-muted-foreground" onClick={() => navigate("/reset-admin-password")}>
                  Esqueceu a senha? (Apenas Admin)
                </Button>}
            </form>
          </CardContent>
        </Card>

      </div>
    </div>;
};
export default Auth;