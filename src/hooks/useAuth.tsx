import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Limpar estado imediatamente
    setUser(null);
    setSession(null);
    setLoading(false);
    
    try {
      // Fazer logout global para limpar tudo
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      // Ignorar erros - estado já foi limpo
      console.log("signOut error (ignored):", error);
    }
    
    // Forçar limpeza completa do localStorage
    localStorage.removeItem('sb-cfdnrbyeuqtrjzzjyuon-auth-token');
  };

  return { user, session, loading, signOut };
};
