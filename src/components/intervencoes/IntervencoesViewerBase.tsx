import React, { useEffect, useState } from "react";
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

type Props = {
  tipoElemento: TipoElemento;
  tipoOrigem: TipoOrigem;
  tabelaIntervencao: string;
  titulo: string;
  badgeColor?: string;
  badgeLabel?: string;
};

const PONTUAIS: TipoElemento[] = ["placas", "inscricoes", "porticos"];

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

export default function IntervencoesViewerBase({
  tipoElemento,
  tipoOrigem,
  tabelaIntervencao,
  titulo,
}: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const isPontual = PONTUAIS.includes(tipoElemento);

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
      setRows(data || []);
    } catch (e: any) {
      setErrMsg(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRows();
  }, [tabelaIntervencao, tipoOrigem]);

  function abrirForm(row: any) {
    if (!row?.id) return;
    // abre o formulário de edição
    window.location.href = `${window.location.pathname}?edit=${row.id}`;
  }

  async function excluir(row: any) {
    if (!confirm("Confirma excluir esta intervenção?")) return;
    const supabase = getSupabase();
    if (!supabase) return alert("Supabase indisponível.");
    const { error } = await supabase.from(tabelaIntervencao).delete().eq("id", row.id);
    if (error) return alert("Erro ao excluir: " + error.message);
    await fetchRows();
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>{titulo}</h2>

      {errMsg && (
        <div
          style={{
            background: "#FEF3C7",
            border: "1px solid #F59E0B",
            borderRadius: 6,
            padding: 8,
            color: "#7C2D12",
            marginBottom: 10,
          }}
        >
          {errMsg}
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: "#f9fafb" }}>
          <tr>
            <th style={th}>KM Inicial</th>
            {!isPontual && <th style={th}>KM Final</th>}
            <th style={th}>Código</th>
            <th style={th}>Enviada?</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={isPontual ? 4 : 5} style={tdCenter}>
                Carregando...
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={isPontual ? 4 : 5} style={tdCenter}>
                Nenhum registro.
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((r) => (
              <tr key={r.id}>
                <td style={td}>{formatKm(r.km_inicial)}</td>
                {!isPontual && <td style={td}>{formatKm(r.km_final)}</td>}
                <td style={td}>{r.codigo ?? "—"}</td>
                <td style={td}>{r.enviada ? "Sim" : "Não"}</td>
                <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                  <button
                    onClick={() => abrirForm(r)}
                    style={btn}
                    title="Abrir/Editar"
                  >
                    👁️
                  </button>
                  <button
                    onClick={() => excluir(r)}
                    style={{ ...btn, color: "#991b1b" }}
                    title="Excluir"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

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
  border: "none",
  padding: "4px 6px",
  fontSize: 16,
};
