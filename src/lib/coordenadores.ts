// src/lib/coordenadores.ts
// Ordem: coordinator_assignments -> supervisora (profiles + user_roles) -> Fallback: profiles (sem role)
// Sem contrato_id/ul_id.

import type { SupabaseClient } from "@supabase/supabase-js";

export async function findCoordinatorsByLoteId(supabase: SupabaseClient, loteId: string): Promise<string[]> {
  // 1) Atribuição explícita (fonte de verdade da sua UI)
  const { data: assign, error: aErr } = await supabase
    .from("coordinator_assignments")
    .select("user_id")
    .eq("lote_id", loteId);
  if (aErr) throw aErr;
  if (assign?.length) return assign.map((r) => r.user_id);

  // 2) Supervisora do lote
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

  // 2.2) Filtra por role=coordenador (se acessível)
  try {
    const { data: roles, error: rErr } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "coordenador")
      .in("user_id", ids);

    if (rErr) {
      console.warn("[WARN] user_roles bloqueado ou erro: usando perfis como fallback.", rErr);
      return ids; // fallback: envia para todos os perfis da supervisora
    }
    if (roles?.length) return roles.map((r) => r.user_id);

    // Se não houver nenhum com role, ainda assim não travar:
    console.warn("[WARN] Nenhum role='coordenador' encontrado: usando perfis como fallback.");
    return ids;
  } catch (e) {
    console.warn("[WARN] user_roles inacessível: usando perfis como fallback.", e);
    return ids;
  }
}
