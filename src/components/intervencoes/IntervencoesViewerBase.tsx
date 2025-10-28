import React, { useEffect, useMemo, useState } from "react";
import * as Supa from "../../integrations/supabase/client";

type TipoElemento = "placas" | "inscricoes" | "porticos" | "sh" | "defensas" | "tachas" | "cilindros";

type TipoOrigem = "execucao" | "manutencao_pre_projeto";
type BadgeColor = "secondary" | "destructive" | "outline" | "success" | "warning" | "default";

export type IntervencoesViewerBaseProps = {
  tipoElemento: TipoElemento;
  tipoOrigem: TipoOrigem;
  tabelaIntervencao: string;
  titulo: string;
  badgeColor?: BadgeColor;
  badgeLabel?: string;

  // callback antigo (se algum viewer passar, usamos ele)
  onVerIntervencao?: (row: any) => void;

  // opcional: construir URL de edição (se você tiver rota que abre form por query)
  getEditUrl?: (ctx: { tipoElemento: string; tipoOrigem: string; row: any }) => string;

  onAfterRefresh?: (rows: any[]) => void;
  loadData?: (args: { tabela: string; tipoOrigem: string }) => Promise<any[]>;
};

const PONTUAIS: readonly TipoElemento[] = ["placas", "inscricoes", "porticos"] as const;

function getSupabase(): any | null {
  const client = (Supa as any)?.supabase ?? (Supa as any)?.default ?? (Supa as any);
  return client && typeof client.from === "function" ? client : null;
}

function formatKm(v?: number | string | null) {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : (v as number);
  return isFinite(n) ? n.toFixed(3).replace(".", ",") : String(v);
}

// normalizações de campos
function normalizeKmInicial(item: any): number | null {
  const v = item?.km_inicial ?? item?.kmInicial ?? item?.km_ini;
  return v === undefined || v === null ? null : Number(v);
}
function normalizeKmFinal(item: any, isPontual: boolean): number | null {
  if (isPontual) return null;
  const v = item?.km_final ?? item?.kmFinal ?? item?.km_fim ?? item?.kmFim ?? null;
  return v === undefined || v === null ? null : Number(v);
}
function normalizeCodigo(item: any): string | null {
  return (item?.codigo ?? item?.sigla ?? item?.cod ?? null) as string | null;
}
function normalizeRodovia(item: any): string | null {
  return (item?.rodovia ?? item?.br ?? null) as string | null;
}
function adaptRow(item: any, isPontual: boolean) {
  return {
    ...item,
    id: item?.id ?? item?.uuid ?? item?.pk ?? null,
    rodovia: normalizeRodovia(item),
    km_inicial: normalizeKmInicial(item),
    km_final: normalizeKmFinal(item, isPontual),
    codigo: normalizeCodigo(item),
    enviada: Boolean(item?.enviada),
  };
}

export default function IntervencoesViewerBase(props: IntervencoesViewerBaseProps) {
  const {
    tipoElemento,
    tipoOrigem,
    tabelaIntervencao,
    titulo,
    badgeColor = "secondary",
    badgeLabel = "",
    onVerIntervencao,
    getEditUrl,
    onAfterRefresh,
    loadData,
  } = props;

  const isPontual = useMemo(() => PONTUAIS.includes(tipoElemento), [tipoElemento]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  type Filtro = "todas" | "enviadas" | "nao_enviadas";
  const [filtro, setFiltro] = useState<Filtro>("todas");

  async function fetchRows() {
    setLoading(true);
    setErrMsg(null);
    try {
      let data: any[] = [];
      if (typeof loadData === "function") {
        data = await loadData({ tabela: tabelaIntervencao, tipoOrigem });
      } else {
        const supabase = getSupabase();
        if (!supabase) {
          setErrMsg("Supabase não detectado. Confira o import de src/integrations/supabase/client.ts.");
          setRows([]);
          setLoading(false);
          return;
        }
        const { data: result, error } = await supabase
          .from(tabelaIntervencao)
          .select("*")
          .eq("tipo_origem", tipoOrigem)
          .order("id", { ascending: false });
        if (error) throw error;
        data = Array.isArray(result) ? result : [];
      }
      const adapted = data.map((d) => adaptRow(d, isPontual));
      setRows(adapted);
      onAfterRefresh?.(adapted);
    } catch (e: any) {
      setErrMsg(e?.message ?? "Erro ao carregar dados");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabelaIntervencao, tipoOrigem, tipoElemento]);

  const filtered = useMemo(() => {
    if (filtro === "todas") return rows;
    if (filtro === "enviadas") return rows.filter((r) => r.enviada === true);
    return rows.filter((r) => !r.enviada);
  }, [rows, filtro]);

  async function marcarComoEnviadas(selected: any[]) {
    const supabase = getSupabase();
    if (!supabase) return alert("Supabase indisponível.");
    const ids = selected.map((r) => r.id).filter(Boolean);
    if (!ids.length) return;
    const { error } = await supabase.from(tabelaIntervencao).update({ enviada: true }).in("id", ids);
    if (error) return alert("Erro ao enviar: " + error.message);
    await fetchRows();
    alert("Intervenções enviadas.");
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

  // -------- Fallback para o "olhinho" --------
  function handleVer(row: any) {
    if (onVerIntervencao) {
      onVerIntervencao(row);
      return;
    }
    // 1) Dispara evento global (você pode ouvir isso em qualquer lugar do app)
    try {
      window.dispatchEvent(
        new CustomEvent("viewer:verIntervencao", {
          detail: { tipoElemento, tipoOrigem, row },
        }),
      );
    } catch {}

    // 2) Se tiver uma rota que aceita ?edit=ID, tenta navegar
    const url =
      getEditUrl?.({ tipoElemento, tipoOrigem, row }) ??
      (typeof location !== "undefined"
        ? `${location.pathname}?tipo=${tipoElemento}&origem=${tipoOrigem}&edit=${encodeURIComponent(row?.id ?? "")}`
        : null);
    if (url) {
      try {
        history.pushState({}, "", url);
        // alguns apps escutam mudanças de URL para abrir drawer/form
        window.dispatchEvent(new Event("popstate"));
      } catch {}
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>{titulo}</h2>
        {badgeLabel ? (
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 12,
              background: badgeColor === "warning" ? "#facc15" : "#e5e7eb",
              color: "#111827",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {badgeLabel}
          </span>
        ) : null}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <select value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)} style={{ padding: 6 }}>
            <option value="todas">Todas</option>
            <option value="enviadas">Enviadas</option>
            <option value="nao_enviadas">Não enviadas</option>
          </select>
          <button onClick={fetchRows} disabled={loading} style={{ padding: "6px 10px" }}>
            Atualizar
          </button>
        </div>
      </div>

      {errMsg ? (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            background: "#FEF3C7",
            border: "1px solid #F59E0B",
            borderRadius: 6,
            color: "#7C2D12",
          }}
        >
          {errMsg}
        </div>
      ) : null}

      <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb" }}>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Rodovia</th>
              <th style={th}>KM Inicial</th>
              {!isPontual && <th style={th}>KM Final</th>}
              <th style={th}>Código</th>
              <th style={th}>Enviada?</th>
              <th style={th} />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={isPontual ? 6 : 7} style={{ padding: 16, textAlign: "center" }}>
                  Carregando...
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={isPontual ? 6 : 7} style={{ padding: 16, textAlign: "center" }}>
                  Nenhum registro.
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((row) => {
                const kmIni = formatKm(row.km_inicial);
                const kmFim = formatKm(row.km_final);
                const enviadaLabel = row.enviada ? "Sim" : "Não";
                return (
                  <tr key={row.id ?? Math.random()}>
                    <td style={td}>{row.id ?? "—"}</td>
                    <td style={td}>{row.rodovia ?? "—"}</td>
                    <td style={td}>{kmIni}</td>
                    {!isPontual && <td style={td}>{kmFim}</td>}
                    <td style={td}>{row.codigo ?? "—"}</td>
                    <td style={td}>{enviadaLabel}</td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        onClick={() => handleVer(row)}
                        style={{ marginRight: 8, padding: "4px 8px", cursor: "pointer" }}
                        title="Abrir/Editar"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => marcarComoEnviadas([row])}
                        style={{ marginRight: 8, padding: "4px 8px", cursor: "pointer" }}
                        title="Enviar ao coordenador"
                        disabled={row.enviada}
                      >
                        ✉️
                      </button>
                      <button
                        onClick={() => excluir(row)}
                        style={{ padding: "4px 8px", color: "#991b1b", cursor: "pointer" }}
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  fontWeight: 600,
  padding: "10px 12px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: 13,
  color: "#111827",
};
const td: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #f3f4f6",
  fontSize: 13,
  color: "#111827",
};
