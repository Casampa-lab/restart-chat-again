import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Monitor, Smartphone } from "lucide-react";
import logoOperaVia from "@/assets/logo-operavia.png";
import { useIOSDetection } from "@/hooks/useIOSDetection";

const Auth = () => {
  const navigate = useNavigate();
  const { isModernIOS } = useIOSDetection();
  
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [codigoConvite, setCodigoConvite] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);
  const [modoAcesso, setModoAcesso] = useState<'web' | 'campo'>(() => {
    // Se for iOS moderno, forçar modo campo
    if (isModernIOS) {
      localStorage.setItem('modoAcesso', 'campo');
      return 'campo';
    }
    
    // Senão, usar modo salvo ou padrão
    const savedModo = localStorage.getItem('modoAcesso') as 'web' | 'campo';
    return savedModo || 'web';
  });
  const [isSignupFlow, setIsSignupFlow] = useState(false);
  useEffect(() => {
    // Recuperar último email usado
    const lastEmail = localStorage.getItem("lastEmail");
    if (lastEmail) {
      setEmail(lastEmail);
    }
  }, []);

  // Sincronizar modo quando detecção iOS completar
  useEffect(() => {
    if (isModernIOS && modoAcesso !== 'campo') {
      setModoAcesso('campo');
      localStorage.setItem('modoAcesso', 'campo');
    }
  }, [isModernIOS, modoAcesso]);
  useEffect(() => {
    const checkSession = async () => {
      const startTime = Date.now();
      console.log('[Auth] Verificando sessão existente...');
      
      try {
        const {
          data: {
            session
          }
        } = await supabase.auth.getSession();
        
        console.log(`[Auth] Sessão verificada em ${Date.now() - startTime}ms`, { 
          hasSession: !!session,
          currentPath: window.location.pathname 
        });
        
        // APENAS redirecionar se estiver na página de auth
        if (session && window.location.pathname === '/auth') {
          const savedModo = localStorage.getItem('modoAcesso') as 'web' | 'campo' || 'web';
          navigate(savedModo === 'campo' ? "/modo-campo" : "/", { replace: true });
        }
      } catch (error) {
        console.error('[Auth] Erro ao verificar sessão:', error);
        // Limpar tokens corrompidos
        localStorage.removeItem('sb-cfdnrbyeuqtrjzzjyuon-auth-token');
      }
    };
    checkSession();

    // Listener apenas para mudanças de autenticação
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] Estado de autenticação mudou:', event);
      
      // Só redirecionar quando há um SIGNED_IN explícito E não estamos em fluxo de signup
      if (event === 'SIGNED_IN' && session && !isSignupFlow) {
        const savedModo = localStorage.getItem('modoAcesso') as 'web' | 'campo' || 'web';
        navigate(savedModo === 'campo' ? "/modo-campo" : "/", { replace: true });
      }
      
      // Resetar flag de signup após logout
      if (event === 'SIGNED_OUT') {
        setIsSignupFlow(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const startTime = Date.now();
    console.log(`[Auth] Iniciando ${isLogin ? 'login' : 'cadastro'}...`);
    
    // Timeout de 10 segundos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout: Operação demorou mais de 10 segundos')), 10000)
    );
    
    try {
      if (isLogin) {
        console.log('[Auth] Tentando login...');
        const loginPromise = supabase.auth.signInWithPassword({
          email,
          password
        });
        
        const { error } = await Promise.race([loginPromise, timeoutPromise]) as any;
        
        if (error) {
          console.error('[Auth] Erro no login:', error);
          // Limpar tokens corrompidos em caso de erro
          if (error.message?.includes('Invalid') || error.message?.includes('refresh_token')) {
            console.log('[Auth] Limpando tokens corrompidos...');
            localStorage.removeItem('sb-cfdnrbyeuqtrjzzjyuon-auth-token');
          }
          throw error;
        }
        
        console.log(`[Auth] Login bem-sucedido em ${Date.now() - startTime}ms`);
        localStorage.setItem("lastEmail", email);
        toast.success("Login realizado com sucesso!");
        navigate(modoAcesso === 'campo' ? "/modo-campo" : "/");
      } else {
        console.log('[Auth] Tentando cadastro...');
        
        // Marcar que estamos em fluxo de signup
        setIsSignupFlow(true);
        
        const signupPromise = supabase.auth.signUp({
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
        
        const { error } = await Promise.race([signupPromise, timeoutPromise]) as any;
        
        if (error) {
          console.error('[Auth] Erro no cadastro:', error);
          setIsSignupFlow(false);
          throw error;
        }
        
        console.log(`[Auth] Cadastro bem-sucedido em ${Date.now() - startTime}ms`);
        
        // FORÇAR LOGOUT após signup para evitar login automático
        await supabase.auth.signOut();
        
        localStorage.setItem("lastEmail", email);
        toast.success("Conta criada! Faça login para continuar.");
        setIsLogin(true);
        setIsSignupFlow(false);
      }
    } catch (error: any) {
      console.error(`[Auth] Erro após ${Date.now() - startTime}ms:`, error);
      
      if (error.message?.includes('Timeout')) {
        toast.error("A operação está demorando muito. Tente novamente.");
      } else {
        toast.error(error.message || "Erro ao autenticar");
      }
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
  return <div className="fixed inset-0 flex flex-col bg-gray-50 overflow-y-auto">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-3">
          <div className="flex flex-col items-center gap-2 bg-card rounded-xl p-8 shadow-lg">
            <img src={logoOperaVia} alt="OperaVia" className="h-48 w-48 object-contain" />
          </div>
          
          {/* Seleção de Modo */}
          {!isModernIOS && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-xl text-center">Escolha o Modo de Acesso</CardTitle>
                <CardDescription className="text-center">
                  Selecione a interface ideal para seu contexto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Modo Web Completo */}
                  <button
                    onClick={() => {
                      setModoAcesso('web');
                      localStorage.setItem('modoAcesso', 'web');
                    }}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      modoAcesso === 'web' 
                        ? 'border-primary bg-primary/10 shadow-lg' 
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <Monitor className="h-12 w-12 mx-auto mb-3 text-primary" />
                    <h3 className="font-bold text-lg mb-2">Sistema Web</h3>
                    <p className="text-xs text-muted-foreground">
                      Escritório • Dashboard completo • Relatórios • VABLE
                    </p>
                    {modoAcesso === 'web' && (
                      <Badge className="mt-3 bg-primary">Selecionado</Badge>
                    )}
                  </button>

                  {/* Modo Campo */}
                  <button
                    onClick={() => {
                      setModoAcesso('campo');
                      localStorage.setItem('modoAcesso', 'campo');
                    }}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      modoAcesso === 'campo' 
                        ? 'border-green-600 bg-green-50 shadow-lg' 
                        : 'border-muted hover:border-green-600/50'
                    }`}
                  >
                    <Smartphone className="h-12 w-12 mx-auto mb-3 text-green-600" />
                    <h3 className="font-bold text-lg mb-2">Modo Campo</h3>
                    <p className="text-xs text-muted-foreground">
                      Mobile • GPS • Fotos • Intervenções rápidas
                    </p>
                    {modoAcesso === 'campo' && (
                      <Badge className="mt-3 bg-green-600">Selecionado</Badge>
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Badge informativo para usuários iOS */}
          {isModernIOS && (
            <Card className="w-full bg-green-50 border-green-600">
              <CardContent className="py-4">
                <div className="flex items-center justify-center gap-2">
                  <Smartphone className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-medium text-green-900">
                    Modo Campo ativado automaticamente (dispositivo iOS detectado)
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          
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
                <a href="mailto:contato@operavia.online" className="text-primary hover:underline font-medium">
                  contato@operavia.online
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
};
export default Auth;