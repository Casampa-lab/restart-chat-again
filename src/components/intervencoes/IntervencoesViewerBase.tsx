import React, { useEffect, useMemo, useState } from "react";
import * as Supa from "../../integrations/supabase/client";

type TipoElemento =
  | "placas"
  | "inscricoes"
  | "porticos"
  | "sh"
  | "defensas"
  | "tachas"
  | "cilindros";

type TipoOrigem = "execucao" | "manutencao_pre_projeto";

type ColumnKey = "km_inicial" | "km_final" | "codigo" | "enviada";

type Props = {
  tipoElemento: TipoElemento;
  tipoOrigem: TipoOrigem;
  tabelaIntervencao: string;
  titulo: string;

  /** Quais colunas exibir (ordem respeitada). Se nada for passado:
   *  - pontuais: ["km_inicial","codigo","enviada"]
   *  - lineares: ["km_inicial","km_final","codigo","enviada"]
   */
  columns?: ColumnKey[];

  /** Callback para abrir/editar intervenção (opcional) */
  onVerIntervencao?: (row: any) => void;

  /** Constrói URL de edição (opcional) */
  getEditUrl?: (ctx: { tipoElemento: string; tipoOrigem: string; row: any }) => string;
};

const PONTUAIS: TipoElemento[] = ["placas", "inscricoes", "porticos"];

// ---------- helpers ----------
function getSupabase() {
  const client =
    (Supa as any)?.supabase ??
    (Supa as any)?.default ??
    (Supa as any);
  return client && typeof client.from === "function" ? client : null;
}

function formatKm(v?: number | string | null) {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : (v as number);
  return isFinite(n) ? n.toFixed(3).replace(".", ",") : String(v);
}

function norm(v: any, ...keys: string[]) {
  for (const k of keys) {
    const val = v?.[k];
    if (val !== undefined && val !== null) return val;
  }
  return null;
}

function adaptRow(item: any, isPontual: boolean) {
  const id = norm(item, "id", "uuid", "pk");
  const km_inicial = Number(norm(item, "km_inicial", "kmInicial", "km_ini"));
  const km_final = isPontual
    ? null
    : Number(
        norm(item, "km_final", "kmFinal", "km_fim", "kmFim")
      );
  const codigo = norm(item, "codigo", "sigla", "cod");
  const enviada = Boolean(norm(item, "enviada"));

  return {
    ...item,
    id,
    km_inicial: isNaN(km_inicial) ? null : km_inicial,
    km_final: km_final !== null && !isNaN(km_final) ? km_final : null,
    codigo: codigo ?? null,
    enviada,
  };
}

// ---------- componente ----------
export default function IntervencoesViewerBase({
  tipoElemento,
  tipoOrigem,
  tabelaIntervencao,
  titulo,
  columns,
  onVerIntervencao,
  getEditUrl,
}: Props) {
  const isPontual = useMemo(() => PONTUAIS.includes(tipoElemento), [tipoElemento]);

  // default columns
  const cols: ColumnKey[] = useMemo(() => {
    if (columns && columns.length) return columns;
    return isPontual
      ? ["km_inicial", "codigo", "enviada"]
      : ["km_inicial", "km_final", "codigo", "enviada"];
  }, [columns, isPontual]);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function fetchRows() {
    setLoading(true);
    setErrMsg(null);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase não detectado.");

      const { data, error } = await supabase
        .from(tabelaIntervencao)
        .select("*")
        .eq("tipo_origem", tipoOrigem)
        .order("id", { ascending: false });

      if (error) throw error;

      const adapted = (data ?? []).map((d: any) => adaptRow(d, isPontual));
      setRows(adapted);
    } catch (e: any) {
      setErrMsg(e.message ?? "Erro ao carregar dados");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabelaIntervencao, tipoOrigem, tipoElemento]);

  function abrirForm(row: any) {
    // 1) Se o viewer pai passou um callback, usamos
    if (onVerIntervencao) {
      onVerIntervencao(row);
      return;
    }
    // 2) Se existir uma função global definida em alguma página/rota
    const g: any = window as any;
    if (typeof g.__openIntervencao === "function") {
      try {
        g.__openIntervencao({ tipoElemento, tipoOrigem, row });
        return;
      } catch {}
    }
    // 3) Fallback: navegamos adicionando ?edit=<id> à URL atual
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("edit", row?.id ?? "");
      // (se sua rota depende de outros params, mantemos todos)
      window.location.href = url.toString();
    } catch {
      // último recurso
      window.location.href = `${window.location.pathname}?edit=${encodeURIComponent(row?.id ?? "")}`;
    }
  }

  async function excluir(row: any) {
    if (!row?.id) return;
    if (!confirm("Confirma excluir esta intervenção?")) return;
    const supabase = getSupabase();
    if (!supabase) return alert("Supabase indisponível.");
    const { error } = await supabase.from(tabelaIntervencao).delete().eq("id", row.id);
    if (error) return alert("Erro ao excluir: " + erro
