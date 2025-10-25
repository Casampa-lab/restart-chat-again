// src/lib/coordenadores.ts
// Helper centralizado para resolver coordenadores a partir de um Lote
// Prioriza coordinator_assignments; depois cai para supervisora/user_roles; por fim usa default_coordinators.

import type { SupabaseClient } from "@supabase/supabase-js";

export async function findCoordinatorsByLoteId(
  supabase: SupabaseClient,
  loteId: string
): Promise<string[]> {
  // 1) Fonte de verdade: coordinator_assignments
  const { data: assign, error: aErr } = await supabase
    .from("coordinator_assignments")
    .select("user_id")
    .eq("lote_id", loteId);

  if (aErr) throw aErr;
  if (assign && assign.length) return assign.map(r => r.user_id);

  // 2) Se não houver assignment, buscar pela supervisora do lote
  const { data: lote, error: lErr } = await supabase
    .from("lotes")
    .select("supervisora_id, ul_id, contrato_id")
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
  const ids = (profs ?? []).map(p => p.id);
  if (!ids.length) return [];

  // Papeis "coordenador"
  const { data: roles, error: rErr } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "coordenador")
    .in("user_id", ids);

  if (rErr) throw rErr;
  if (roles?.length) return roles.map(r => r.user_id);

  // 3) Fallback final: coordenadores padrão (opcional)
  const { data: defaults, error: dErr } = await supabase
    .from("default_coordinators")
    .select("user_id")
    .or([
      lote.contrato_id ? `contrato_id.eq.${lote.contrato_id}` : "contrato_id.is.null",
      lote.ul_id ? `ul_id.eq.${lote.ul_id}` : "ul_id.is.null",
    ].join(","));

  if (dErr) {
    // não quebra o fluxo: se tabela não existir, apenas retorna []
    return [];
  }

  return (defaults ?? []).map(d => d.user_id);
}
