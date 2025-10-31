import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type RoleState = {
  roles: string[];
  isAdmin: boolean;
  loadingRoles: boolean;
  error?: string;
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // <- NOVO: estado para papeis (roles)
  const [roleState, setRoleState] = useState<RoleState>({
    roles: [],
    isAdmin: false,
    loadingRoles: true,
  });

  // carrega sessão + user
  useEffect(() => {
    const startTime = Date.now();
    console.log("[useAuth] Inicializando hook de autenticação...");

    // listener de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
        console.log(`[useAuth] Evento de autenticação: ${event}`, {
          hasSession: !!session,
          currentPath: window.location.pathname,
          elapsedTime: `${Date.now() - startTime}ms`,
        });

        // se o refresh falhar, limpa token corrompido
        if (event === "TOKEN_REFRESHED" && !session) {
          console.log("[useAuth] Token refresh falhou, limpando localStorage...");
          localStorage.removeItem("sb-cfdnrbyeuqtrjzzjyuon-auth-token");
        }

        setSession(session ?? null);
        setUser(session?.user ?? null);
        setLoading(false);
    });

    // sessão inicial
    console.log("[useAuth] Buscando sessão inicial...");
    const sessionStart = Date.now();

    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        console.log(
          `[useAuth] Sessão inicial obtida em ${Date.now() - sessionStart}ms`,
          {
            hasSession: !!session,
            hasError: !!error,
            currentPath: window.location.pathname,
          }
        );

        if (error) {
          console.error("[useAuth] Erro ao buscar sessão:", error);
          localStorage.removeItem("sb-cfdnrbyeuqtrjzzjyuon-auth-token");
        }

        setSession(session ?? null);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
        console.error("[useAuth] Erro crítico ao buscar sessão:", error);
        localStorage.removeItem("sb-cfdnrbyeuqtrjzzjyuon-auth-token");
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  // carrega roles do usuário logado
  useEffect(() => {
    const fetchRoles = async () => {
      // se ainda não temos user, não tenta buscar role
      if (!user) {
        setRoleState({
          roles: [],
          isAdmin: false,
          loadingRoles: false,
        });
        return;
      }

      console.log("[useAuth] Buscando roles do usuário...", {
        uid: user.id,
        email: user.email,
      });

      // consulta tabela user_roles
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("[useAuth] Erro ao buscar user_roles:", error);

        // fallback seguro: sem roles => não é admin
        setRoleState({
          roles: [],
          isAdmin: false,
          loadingRoles: false,
          error: error.message,
        });
        return;
      }

      const roles = Array.isArray(data)
        ? data.map((r) => r.role)
        : [];

      const isAdmin = roles.includes("admin");

      console.log("[useAuth] Roles carregados:", {
        roles,
        isAdmin,
      });

      setRoleState({
        roles,
        isAdmin,
        loadingRoles: false,
      });
    };

    fetchRoles();
  }, [user]);

  const signOut = async () => {
    const startTime = Date.now();
    console.log("[useAuth] Iniciando logout...");

    // limpar estado imediatamente
    setUser(null);
    setSession(null);
    setLoading(false);
    setRoleState({
      roles: [],
      isAdmin: false,
      loadingRoles: false,
    });

    try {
      await supabase.auth.signOut({ scope: "global" });
      console.log(
        `[useAuth] Logout concluído em ${Date.now() - startTime}ms`
      );
    } catch (error) {
      console.log(
        `[useAuth] Erro no logout (ignorado) após ${
          Date.now() - startTime
        }ms:`,
        error
      );
    }

    // garante limpeza
    localStorage.removeItem("sb-cfdnrbyeuqtrjzzjyuon-auth-token");
    console.log("[useAuth] localStorage limpo");
  };

  return {
    user,
    session,
    loading,
    signOut,

    // NOVO: expõe roles / isAdmin pro resto da app
    roles: roleState.roles,
    isAdmin: roleState.isAdmin,
    loadingRoles: roleState.loadingRoles,
    rolesError: roleState.error,
  };
};
