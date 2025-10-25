// src/lib/coordenadores.ts
// Busca coordenadores a partir do Lote.
// Prioriza coordinator_assignments; se vazio, usa supervisora + role=coordenador;
// por fim tenta default_coordinators com contrato_id (ul_id removido).

import type { SupabaseClient } from "@supabase/supabase-js";

export async function findCoordinatorsByLoteId(supabase: SupabaseClient, loteId: string): Promise<string[]> {
  // 1) Fonte de verdade: assignments explícitos (lote -> user)
  const { data: assign, error: aErr } = await supabase
    .from("coordinator_assignments")
    .select("user_id")
    .eq("lote_id", loteId);

  if (aErr) throw aErr;
  if (assign?.length) return assign.map((r) => r.user_id);

  // 2) Buscar apenas colunas que existem (ul_id removido)
  //    Se sua tabela não tiver contrato_id, o maybeSingle não quebra — só volta null.
  const { data: lote, error: lErr } = await supabase
    .from("lotes")
    .select("supervisora_id, contrato_id")
    .eq("id", loteId)
    .maybeSingle();

  if (lErr) throw lErr;
  if (!lote?.supervisora_id) return [];

  // Perfis da mesma supervisora
  const { data: profs, error: pErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("supervisora_id", lote.supervisora_id);

  if (pErr) throw pErr;
  const ids = (profs ?? []).map((p) => p.id);
  if (!ids.length) return [];

  // Filtra por papel "coordenador"
  const { data: roles, error: rErr } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "coordenador")
    .in("user_id", ids);

  if (rErr) throw rErr;
  if (roles?.length) return roles.map((r) => r.user_id);

  // 3) Fallback final: coordenadores padrão por contrato (sem ul_id)
  try {
    const orFilters = [];
    if (lote?.contrato_id) {
      orFilters.push(`contrato_id.eq.${lote.contrato_id}`);
    } else {
      // se não houver contrato_id, não filtra por contrato (usa .is.null para não quebrar OR)
      orFilters.push("contrato_id.is.null");
    }

    const { data: defaults } = await supabase.from("default_coordinators").select("user_id").or(orFilters.join(","));
    return (defaults ?? []).map((d) => d.user_id);
  } catch {
    // Se a tabela default_coordinators não existir, apenas ignore o fallback.
    return [];
  }
}
