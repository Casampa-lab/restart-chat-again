import React, { useEffect, useMemo, useState } from "react";
import * as Supa from "../../integrations/supabase/client";

// ---------------- Tipos ----------------
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

type BadgeColor = "secondary" | "destructive" | "outline" | "success" | "warning" | "default";

type Props = {
  tipoElemento: TipoElemento;
  tipoOrigem: TipoOrigem;
  tabelaIntervencao: string;
  titulo: string;

  badgeColor?: BadgeColor;
  badgeLabel?: string;

  /** Colunas que você quer ver e na ordem que preferir */
  columns?: ColumnKey[];

  /** Abre/edita uma intervenção existente (opcional) */
  onVerIntervencao?: (row: any) => void;

  /** Constrói URL de edição (opcional) */
  getEditUrl?: (ctx: { tipoElemento: string; tipoOrigem: string; row: any }) => string;

  /** Cria uma intervenção nova (opcional) */
  onNovo?: (ctx: { tipoElemento: string; tipoOrigem: string }) => void;

  /** Constrói URL de criação (opcional) */
  getNewUrl?: (ctx: { tipoElemento: string; tipoOrigem: string }) => string;
};

// --------------- Constantes ---------------
const PONTUAIS: TipoElemento[] = ["placas", "inscricoes", "porticos"];

// --------------- Helpers ---------------
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

function pick(v: any, ...keys: string[]) {
  for (const k of keys) {
    const val = v?.[k];
    if (val !== undefined && val !== null && val !== "") return val;
  }
  return null;
}

/** tenta achar qualquer “código” possível */
function pickCodigo(item: any): string | null {
  const direct = pick(item, "codigo", "sigla", "cod", "codigo_elemento");
  if (direct) return String(direct);
  // variações por elemento
  const variants = [
    "codigo_cilindro",
    "codigo_placa",
    "codigo_portico",
    "codigo_inscricao",
    "codigo_sh",
    "codigo_defensa",
    "codigo_tacha",
  ];
  for (const k of variants) {
    const v = item?.[k];
    if (v !== undefined && v !== null && v !== "") return String(v);
  }
  return null;
}

function toNumberOrNull(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}

function deriveKmFinalIfPossible(item: any, kmInicial: number | null): number | null {
  if (kmInicial === null) return null;
  // tentativas de campos de extensão/comprimento
  const len =
    toNumberOrNull(pick(item, "extensao", "comprimento", "comprimento_m", "len_m", "length_m", "ext_m"));
  if (len && len > 0) {
    // se veio em metros, converte para km
    const kmAdd = len > 50 ? len / 1000 : len; // heurística simples (se for >50, provavelmente está em metros)
    return +(kmInicial + kmAdd).toFixed(3);
  }
  return null;
}

function adaptRow(item: any, isPontual: boolean) {
  const id = pick(item, "id", "uuid", "pk");
  const kmIni = toNumberOrNull(pick(item, "km_inicial", "kmInicial", "km_ini"));
  // km_final explícito
  let kmFim = isPontual
    ? null
    : toNumberOrNull(pick(item, "km_final", "kmFinal", "km_fim", "kmFim"));
  // se não veio do banco e for linear, tenta derivar
  if (!isPontual && (kmFim === null || kmFim === undefined)) {
    kmFim = deriveKmFinalIfPossible(item, kmIni);
  }
  const codigo = pickCodigo(item);
  const enviada = Boolean(pick(item, "enviada"));

  return {
    ...item,
    id,
    km_inicial: kmIni,
    km_final: kmFim,
    codigo: codigo ?? null,
    enviada,
  };
}

function badgeStyle(color: BadgeColor | undefined): React.CSSProperties {
  let bg = "#e5e7eb"; // secondary/default
  let fg = "#111827";
  if (color === "warning") bg = "#facc15";
  if (color === "success") bg = "#86efac";
  if (color === "destructive") { bg = "#fecaca"; fg = "#7f1d1d"; }
  if (color === "outline") { bg = "transparent"; fg = "#111827"; }
  return {
    padding: "2px 8px",
    borderRadius: 12,
    background: bg,
    color: fg,
    fontSize: 12,
    fontWeight: 600,
    border: color === "outline" ? "1px solid #e5e7eb" : "none",
  };
}

// --------------- Componente ---------------
export default function IntervencoesViewerBase({
  tipoElemento,
  tipoOrigem,
  tabelaIntervencao,
  titulo,
  badgeColor = "secondary",
  badgeLabel = "",
  columns,
  onVerIntervencao,
  getEditUrl,
  onNovo,
  getNewUrl,
}: Props) {
  const isPontual = useMemo(() => PONTUAIS.includes(tipoElemento), [tipoElemento]);

  // colunas padrão
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
    if (onVerIntervencao) {
      onVerIntervencao(row);
      return;
    }
    const g: any = window as any;
    if (typeof g.__openIntervencao === "function") {
      try { g.__openIntervencao({ tipoElemento, tipoOrigem, row }); return; } catch {}
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("edit", row?.id ?? "");
      const finalUrl = getEditUrl?.({ tipoElemento, tipoOrigem, row }) ?? url.toString();
      window.location.assign(finalUrl); // assign para evitar “piscar e voltar”
    } catch {
      window.location.assign(`${window.location.pathname}?edit=${encodeURIComponent(row?.id ?? "")}`);
    }
  }

  function criarNovo() {
    if (onNovo) {
      onNovo({ tipoElemento, tipoOrigem });
      return;
    }
    const g: any = window as any;
    if (typeof g.__newIntervencao === "function") {
      try { g.__newIntervencao({ tipoElemento, tipoOrigem }); return; } catch {}
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("new", "1");
      url.searchParams.set("tipo", String(tipoElemento));
      url.searchParams.set("origem", String(tipoOrigem));
      const finalUrl = getNewUrl?.({ tipoElemento, tipoOrigem }) ?? url.toString();
      window.location.assign(finalUrl);
    } catch {
      window.location.assign(`${window.location.pathname}?new=1&tipo=${tipoElemento}&origem=${tipoOrigem}`);
    }
  }

  async function excluir(row: any) {
    if (!row?.id) return;
    if (!confirm("Confirma excluir esta intervenção?")) return;
    const supabase = getSupabase();
    if (!supabase) return alert("Supabase indisponível.");
    const { error } = await supabase.from(tabelaIntervencao).delete().eq("id", row.id);
    if (error) return alert("Erro ao excluir: " + error.message);
    await fetchRows();
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>{titulo}</h2>
        {badgeLabel ? <span style={badgeStyle(badgeColor)}>{badgeLabel}</span> : null}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={criarNovo} style={btnPrimary} title="Registrar nova intervenção">+ Novo</button>
          <button onClick={fetchRows} style={btn} title="Atualizar">↻</button>
        </div>
      </div>

      {errMsg && <div style={warn}>{errMsg}</div>}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: "#f9fafb" }}>
          <tr>
            {cols.includes("km_inicial") && <th style={th}>KM Inicial</th>}
            {!isPontual && cols.includes("km_final") && <th style={th}>KM Final</th>}
            {cols.includes("codigo") && <th style={th}>Código</th>}
            {cols.includes("enviada") && <th style={th}>Enviada?</th>}
            <th style={th} />
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={cols.length + 1} style={tdCenter}>Carregando...</td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={cols.length + 1} style={tdCenter}>Nenhum registro.</td>
            </tr>
          )}
          {!loading && rows.map((r) => (
            <tr key={r.id ?? Math.random()}>
              {cols.includes("km_inicial") && <td style={td}>{formatKm(r.km_inicial)}</td>}
              {!isPontual && cols.includes("km_final") && <td style={td}>{formatKm(r.km_final)}</td>}
              {cols.includes("codigo") && <td style={td}>{r.codigo ?? "—"}</td>}
              {cols.includes("enviada") && <td style={td}>{r.enviada ? "Sim" : "Não"}</td>}
              <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                <button onClick={() => abrirForm(r)} style={btn} title="Abrir/Editar">👁️</button>
                <button onClick={() => excluir(r)} style={{ ...btn, color: "#991b1b" }} title="Excluir">🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------- estilos mínimos ----------------
const th: React.CSSProperties = {
  textAlign: "left",
  fontWeight: 600,
  padding: "8px 10px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: 13,
};
const td: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid #f3f4f6",
  fontSize: 13,
};
const tdCenter: React.CSSProperties = { ...td, textAlign: "center" };
const btn: React.CSSProperties = {
  cursor: "pointer",
  background: "none",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 14,
};
const btnPrimary: React.CSSProperties = {
  ...btn,
  background: "#2563eb",
  color: "#fff",
  borderColor: "#2563eb",
};
const warn: React.CSSProperties = {
  background: "#FEF3C7",
  border: "1px solid #F59E0B",
  borderRadius: 6,
  padding: 8,
  color: "#7C2D12",
  margin: "0 0 10px",
};
