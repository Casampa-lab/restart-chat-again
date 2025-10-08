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
    console.log("useAuth signOut: iniciando");
    try {
      const { error } = await supabase.auth.signOut();
      console.log("useAuth signOut: resultado", { error });
      
      // Ignorar erro se a sessão já não existe (objetivo do logout alcançado)
      if (error && error.message !== "Auth session missing!") {
        console.error("useAuth signOut: erro não ignorável", error);
        throw error;
      }
      console.log("useAuth signOut: concluído com sucesso");
    } catch (error: any) {
      // Se não for erro de sessão ausente, relançar
      if (error?.message !== "Auth session missing!") {
        console.error("useAuth signOut: erro capturado", error);
        throw error;
      }
    }
  };

  return { user, session, loading, signOut };
};
