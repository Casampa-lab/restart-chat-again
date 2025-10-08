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
    console.log("useAuth signOut: iniciando limpeza");
    
    // Limpar estado imediatamente, independente do resultado da API
    setUser(null);
    setSession(null);
    setLoading(false);
    
    // Tentar fazer logout no servidor (pode falhar se sessão já expirou)
    try {
      await supabase.auth.signOut({ scope: 'local' }); // Apenas local, não global
      console.log("useAuth signOut: logout local concluído");
    } catch (error) {
      console.log("useAuth signOut: erro ignorado (sessão já inválida)", error);
    }
  };

  return { user, session, loading, signOut };
};
