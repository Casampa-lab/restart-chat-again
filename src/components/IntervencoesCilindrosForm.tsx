import React, { useState } from "react";
import { useForm } from "react-hook-form";
import * as Supa from "../integrations/supabase/client";

type TipoOrigem = "execucao" | "manutencao_pre_projeto";

type Props = {
  tipoOrigem: TipoOrigem;
  loteId: string;
  rodoviaId: string;
  user: { id: string } | any;
  onSubmitSuccess?: () => void;
};

type FormData = {
  km_inicial?: string;
  km_final?: string;
  extensao_km?: string;
  codigo?: string;
  motivo?: string;
  solucao?: string;
  snv?: string;
  local_implantacao?: string;
  espacamento_m?: string;
  quantidade?: string;
  latitude_inicial?: string;
  longitude_inicial?: string;
  data_intervencao?: string;
  cilindroSelecionado?: { id: string } | null;
};

export default function IntervencoesCilindrosForm({
  tipoOrigem,
  loteId,
  rodoviaId,
  user,
  onSubmitSuccess,
}: Props) {
  const { register, handleSubmit, reset } = useForm<FormData>();
  const [loading, setLoading] = useState(false);

  // supabase client (compat: default ou nomeado)
  const supabase =
    (Supa as any)?.supabase ??
    (Supa as any)?.default ??
    (Supa as any);

  const isManutencao = tipoOrigem === "manutencao_pre_projeto";

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      if (!supabase || typeof supabase.from !== "function") {
        alert("Supabase não detectado.");
        setLoading(false);
        return;
      }

      // Execução EXIGE item do inventário; Manutenção NÃO.
      if (!isManutencao && !data.cilindroSelecionado) {
        alert("Para Execução de Projeto, selecione um cilindro do inventário primeiro");
        setLoading(false);
        return;
      }

      const kmInicialNum =
        data.km_inicial !== undefined && data.km_inicial !== ""
          ? parseFloat(data.km_inicial)
          : null;

      let kmFinalNum =
        data.km_final !== undefined && data.km_final !== ""
          ? parseFloat(data.km_final)
          : null;

      const extensaoKm =
        data.extensao_km !== undefined && data.extensao_km !== ""
          ? parseFloat(data.extensao_km)
          : null;

      // Deriva km_final se não informado e houver extensão (em km)
      if ((kmFinalNum === null || Number.isNaN(kmFinalNum)) && kmInicialNum !== null) {
        if (extensaoKm !== null && !Number.isNaN(extensaoKm)) {
          kmFinalNum = +(kmInicialNum + extensaoKm).toFixed(3);
        }
      }

      const { error } = await supabase
        .from("ficha_cilindros_intervencoes")
        .insert({
          ficha_cilindros_id: data.cilindroSelecionado?.id ?? null,
          data_intervencao: data.data_intervencao ?? null,
          solucao: data.solucao ?? null,
          motivo: data.motivo ?? null,
          km_inicial: kmInicialNum,
          km_final: kmFinalNum,
          snv: data.snv ?? null,
          local_implantacao: data.local_implantacao ?? null,
          espacamento_m: data.espacamento_m ? parseFloat(data.espacamento_m) : null,
          extensao_km: extensaoKm,
          quantidade: data.quantidade ? parseInt(data.quantidade) : null,
          latitude_inicial: data.latitude_inicial ? parseFloat(data.latitude_inicial) : null,
          longitude_inicial: data.longitude_inicial ? parseFloat(data.longitude_inicial) : null,
          codigo: data.codigo ?? null,
          tipo_origem: tipoOrigem,
          user_id: user?.id ?? null,
          lote_id: loteId,
          rodovia_id: rodoviaId,
        });

      if (error) throw error;

      alert("Intervenção registrada com sucesso!");
      reset();
      onSubmitSuccess?.();
    } catch (e: any) {
      console.error(e);
      alert("Erro ao registrar intervenção: " + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-3">
      <h2 className="text-lg font-semibold mb-2">
        Registrar Intervenção – Cilindros ({isManutencao ? "Manutenção IN-3" : "Execução"})
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm mb-1">KM Inicial</label>
          <input type="number" step="0.001" {...register("km_inicial")} className="border p-2 w-full rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">KM Final (opcional)</label>
          <input type="number" step="0.001" {...register("km_final")} className="border p-2 w-full rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">Extensão (km)</label>
          <input type="number" step="0.001" {...register("extensao_km")} className="border p-2 w-full rounded" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Código (opcional)</label>
          <input {...register("codigo")} className="border p-2 w-full rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">Data da Intervenção</label>
          <input type="date" {...register("data_intervencao")} className="border p-2 w-full rounded" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Motivo</label>
          <input {...register("motivo")} className="border p-2 w-full rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">Solução</label>
          <input {...register("solucao")} className="border p-2 w-full rounded" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm mb-1">SNV</label>
          <input {...register("snv")} className="border p-2 w-full rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">Local de Implantação</label>
          <input {...register("local_implantacao")} className="border p-2 w-full rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">Espaçamento (m)</label>
          <input type="number" step="0.01" {...register("espacamento_m")} className="border p-2 w-full rounded" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm mb-1">Quantidade</label>
          <input type="number" step="1" {...register("quantidade")} className="border p-2 w-full rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">Latitude inicial</label>
          <input type="number" step="0.000001" {...register("latitude_inicial")} className="border p-2 w-full rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">Longitude inicial</label>
          <input type="number" step="0.000001" {...register("longitude_inicial")} className="border p-2 w-full rounded" />
        </div>
      </div>

      {!isManutencao && (
        <div>
          <label className="block text-sm mb-1">
            Selecionar Cilindro do Inventário (obrigatório em Execução)
          </label>
          {/* Substitua este input pelo seu seletor real de inventário */}
          <input placeholder="(seletor de inventário aqui)" {...register("cilindroSelecionado" as any)} className="border p-2 w-full rounded" />
        </div>
      )}

      <div className="pt-2">
        <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Salvando..." : "Salvar Intervenção"}
        </button>
      </div>
    </form>
  );
}
