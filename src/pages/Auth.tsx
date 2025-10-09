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
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [codigoConvite, setCodigoConvite] = useState("");
  const [telefone, setTelefone] = useState("");
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
      setIsForgotPassword(false);
      setIsLogin(true);
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar email de recuperação");
    } finally {
      setLoading(false);
    }
  };
  return <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-primary/10 to-secondary/10 overflow-y-auto">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-3">
          <div className="flex flex-col items-center gap-2 bg-card rounded-xl p-8 shadow-lg">
            <img src={logoOperaVia} alt="OperaVia" className="h-48 w-48 object-contain" />
          </div>
          
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Sistema de Supervisão de
 Operações Rodoviárias</CardTitle>
              <CardDescription className="text-center">
                {isForgotPassword ? "Recuperar senha" : isLogin ? "Entre com suas credenciais" : "Crie sua conta"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={isForgotPassword ? handleForgotPassword : handleAuth} className="space-y-4">
                {!isLogin && <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input id="nome" type="text" value={nome} onChange={e => setNome(e.target.value)} required={!isLogin} />
                  </div>}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                {!isForgotPassword && <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <Input id="senha" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>}
                {!isLogin && <div className="space-y-2">
                    <Label htmlFor="codigoConvite">Código de Convite (opcional)</Label>
                    <Input id="codigoConvite" type="text" value={codigoConvite} onChange={e => setCodigoConvite(e.target.value.toUpperCase())} placeholder="Digite o código de convite se tiver" />
                    <p className="text-xs text-muted-foreground">
                      Se você tem um código de convite de uma supervisora, digite-o aqui
                    </p>
                  </div>}
                {!isLogin && <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone (opcional)</Label>
                    <Input id="telefone" type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
                  </div>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      <span>Processando...</span>
                    </div> : isForgotPassword ? "Enviar email de recuperação" : isLogin ? "Entrar" : "Cadastrar"}
                </Button>
              </form>
              <div className="mt-4 space-y-2 text-center text-sm">
                {isForgotPassword ? (
                  <button onClick={() => {
                    setIsForgotPassword(false);
                    setIsLogin(true);
                  }} className="text-primary hover:underline font-medium">
                    Voltar para login
                  </button>
                ) : isLogin ? (
                  <>
                    <div>
                      Não tem uma conta?{" "}
                      <button onClick={() => setIsLogin(false)} className="text-primary hover:underline font-medium">
                        Cadastre-se
                      </button>
                    </div>
                    <div>
                      <button onClick={() => setIsForgotPassword(true)} className="text-primary hover:underline font-medium">
                        Esqueci minha senha
                      </button>
                    </div>
                  </>
                ) : (
                  <button onClick={() => setIsLogin(true)} className="text-primary hover:underline font-medium">
                    Já tem uma conta? Faça login
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card shadow-lg border-primary/20">
            <CardContent className="py-4">
              <p className="text-sm text-center">
                <span className="font-semibold text-foreground">Contato:</span>{" "}
                <a href="mailto:operavia.online@gmail.com" className="text-primary hover:underline font-medium">
                  operavia.online@gmail.com
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
};
export default Auth;