// src/lib/coordenadores.ts
// Resolve coordenadores por Lote SEM contrato_id/ul_id.
// Ordem: coordinator_assignments -> supervisora (profiles + user_roles)

import type { SupabaseClient } from "@supabase/supabase-js";

export async function findCoordinatorsByLoteId(supabase: SupabaseClient, loteId: string): Promise<string[]> {
  // 1) Atribuição explícita (lote -> user)
  const { data: assign, error: aErr } = await supabase
    .from("coordinator_assignments")
    .select("user_id")
    .eq("lote_id", loteId);

  if (aErr) throw aErr;
  if (assign?.length) return assign.map((r) => r.user_id);

  // 2) Supervisora do lote (somente supervisora_id)
  const { data: lote, error: lErr } = await supabase
    .from("lotes")
    .select("supervisora_id")
    .eq("id", loteId)
    .maybeSingle();

  if (lErr) throw lErr;
  if (!lote?.supervisora_id) return [];

  // 2.1) Perfis da mesma supervisora
  const { data: profs, error: pErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("supervisora_id", lote.supervisora_id);

  if (pErr) throw pErr;
  const ids = (profs ?? []).map((p) => p.id);
  if (!ids.length) return [];

  // 2.2) Filtra papel "coordenador"
  const { data: roles, error: rErr } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "coordenador")
    .in("user_id", ids);

  if (rErr) throw rErr;
  return (roles ?? []).map((r) => r.user_id);
}
