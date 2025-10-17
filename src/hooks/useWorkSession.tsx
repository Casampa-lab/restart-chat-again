import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WorkSession {
  id: string;
  lote_id: string;
  rodovia_id: string;
  data_inicio: string;
  ativa: boolean;
  lote?: {
    numero: string;
    empresa?: {
      nome: string;
    };
  };
  rodovia?: {
    codigo: string;
  };
}

export const useWorkSession = (userId: string | undefined) => {
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [loading, setLoading] = useState(true);

  const loadActiveSession = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("sessoes_trabalho")
        .select(`
          *,
          lote:lotes (
            numero,
            empresa:empresas (nome)
          ),
          rodovia:rodovias (codigo)
        `)
        .eq("user_id", userId)
        .eq("ativa", true)
        .order("data_inicio", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      console.log("📍 Sessão ativa carregada:", data);
      console.log("📍 Rodovia da sessão:", data?.rodovia);
      
      setActiveSession(data);
    } catch (error: any) {
      console.error("Erro ao carregar sessão:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveSession();
  }, [userId]);

  const startSession = async (loteId: string, rodoviaId: string) => {
    if (!userId) return;

    try {
      // Finalizar sessão ativa anterior
      if (activeSession) {
        await supabase
          .from("sessoes_trabalho")
          .update({ ativa: false, data_fim: new Date().toISOString() })
          .eq("id", activeSession.id);
      }

      // Criar nova sessão
      const { data, error } = await supabase
        .from("sessoes_trabalho")
        .insert({
          user_id: userId,
          lote_id: loteId,
          rodovia_id: rodoviaId,
          ativa: true,
        })
        .select(`
          *,
          lote:lotes (
            numero,
            empresa:empresas (nome)
          ),
          rodovia:rodovias (codigo)
        `)
        .single();

      if (error) throw error;

      setActiveSession(data);
      toast.success("Sessão de trabalho iniciada!");
      return data;
    } catch (error: any) {
      toast.error("Erro ao iniciar sessão: " + error.message);
      throw error;
    }
  };

  const endSession = async () => {
    if (!activeSession) return;

    try {
      const { error } = await supabase
        .from("sessoes_trabalho")
        .update({ ativa: false, data_fim: new Date().toISOString() })
        .eq("id", activeSession.id);

      if (error) throw error;

      setActiveSession(null);
      toast.success("Sessão finalizada!");
    } catch (error: any) {
      toast.error("Erro ao finalizar sessão: " + error.message);
    }
  };

  return {
    activeSession,
    loading,
    startSession,
    endSession,
    refreshSession: loadActiveSession,
  };
};
