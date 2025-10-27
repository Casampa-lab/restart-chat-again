import React from "react";
import { CAMPOS_INTERVENCOES } from "@/constants/camposIntervencoes";
import { DadosGrid } from "./DadosGrid";

type Intervencao = {
  id: string;
  tipo_tabela: string;
  tipo_label?: string;
  detalhes: Record<string, any>;
  foto_url?: string;
};

export function DetalhesIntervencaoViewer({
  intervencao,
  mostrarVazios = false,
}: {
  intervencao: Intervencao;
  mostrarVazios?: boolean;
}) {
  const secoes = CAMPOS_INTERVENCOES[intervencao.tipo_tabela] ?? [];
  const dados = intervencao.detalhes || {};
  
  const temValor = (valor: any) => !(valor === null || valor === undefined || valor === '');

  return (
    <div className="space-y-6">
      {/* Galeria de fotos */}
      {intervencao.foto_url && (
        <div className="rounded-lg border border-border overflow-hidden">
          <img 
            src={intervencao.foto_url} 
            alt="Foto da intervenção" 
            className="w-full max-h-96 object-contain"
          />
        </div>
      )}

      {/* Seções com campos */}
      {secoes.map((secao) => {
        const camposFiltrados = mostrarVazios 
          ? secao.campos 
          : secao.campos.filter(c => temValor(dados?.[c.campo]));
        
        if (camposFiltrados.length === 0) return null;

        return (
          <details key={secao.titulo} open className="rounded-2xl border border-border p-3">
            <summary className="cursor-pointer text-sm font-semibold mb-2">
              {secao.titulo}
            </summary>
            <DadosGrid dados={dados} campos={camposFiltrados} />
          </details>
        );
      })}
    </div>
  );
}
