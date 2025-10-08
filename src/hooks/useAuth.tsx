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
    console.log("useAuth signOut: iniciando limpeza completa");
    
    try {
      // Fazer logout no servidor (modo local)
      await supabase.auth.signOut({ scope: 'local' });
      console.log("useAuth signOut: logout local concluído");
    } catch (error) {
      console.log("useAuth signOut: erro ignorado", error);
    }
    
    // Forçar limpeza do estado local independente do resultado
    setUser(null);
    setSession(null);
    
    console.log("useAuth signOut: estado limpo");
  };

  return { user, session, loading, signOut };
};
