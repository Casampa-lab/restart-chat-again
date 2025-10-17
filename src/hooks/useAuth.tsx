import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const startTime = Date.now();
    console.log('[useAuth] Inicializando hook de autenticação...');
    
    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`[useAuth] Evento de autenticação: ${event}`, {
          hasSession: !!session,
          elapsedTime: `${Date.now() - startTime}ms`
        });
        
        // Limpar tokens corrompidos em caso de erro
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.log('[useAuth] Token refresh falhou, limpando localStorage...');
          localStorage.removeItem('sb-cfdnrbyeuqtrjzzjyuon-auth-token');
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    console.log('[useAuth] Buscando sessão inicial...');
    const sessionStart = Date.now();
    
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        console.log(`[useAuth] Sessão inicial obtida em ${Date.now() - sessionStart}ms`, {
          hasSession: !!session,
          hasError: !!error
        });
        
        if (error) {
          console.error('[useAuth] Erro ao buscar sessão:', error);
          // Limpar tokens corrompidos
          localStorage.removeItem('sb-cfdnrbyeuqtrjzzjyuon-auth-token');
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
        console.error('[useAuth] Erro crítico ao buscar sessão:', error);
        localStorage.removeItem('sb-cfdnrbyeuqtrjzzjyuon-auth-token');
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const startTime = Date.now();
    console.log('[useAuth] Iniciando logout...');
    
    // Limpar estado imediatamente
    setUser(null);
    setSession(null);
    setLoading(false);
    
    try {
      // Fazer logout global para limpar tudo
      await supabase.auth.signOut({ scope: 'global' });
      console.log(`[useAuth] Logout concluído em ${Date.now() - startTime}ms`);
    } catch (error) {
      // Ignorar erros - estado já foi limpo
      console.log(`[useAuth] Erro no logout (ignorado) após ${Date.now() - startTime}ms:`, error);
    }
    
    // Forçar limpeza completa do localStorage
    localStorage.removeItem('sb-cfdnrbyeuqtrjzzjyuon-auth-token');
    console.log('[useAuth] localStorage limpo');
  };

  return { user, session, loading, signOut };
};
