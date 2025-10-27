import React from "react";

type CampoTipo = 'text' | 'number' | 'date' | 'boolean';

type CampoDef = { 
  campo: string; 
  label: string; 
  tipo: CampoTipo; 
  decimais?: number; 
  mask?: 'km' | 'gps' | 'snv' 
};

function aplicarMascara(valor: any, mask?: 'km' | 'gps' | 'snv') {
  if (!valor) return valor;
  if (mask === 'km') {
    const num = Number(valor).toFixed(3).replace('.', ',');
    return `KM ${num}`;
  }
  if (mask === 'gps') return String(valor);
  if (mask === 'snv') return String(valor);
  return valor;
}

function formatarValor(valor: any, tipo: CampoTipo, decimais?: number, mask?: any) {
  if (valor === null || valor === undefined || valor === '') return '—';
  
  switch (tipo) {
    case 'number':
      const numFormatado = decimais ? Number(valor).toFixed(decimais) : Number(valor);
      return aplicarMascara(numFormatado, mask);
    case 'date':
      return new Date(valor).toLocaleDateString('pt-BR');
    case 'boolean':
      return valor ? 'Sim' : 'Não';
    default:
      return aplicarMascara(valor, mask);
  }
}

export function DadosGrid({ dados, campos }: { dados: any; campos: CampoDef[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {campos.map((c) => (
        <div key={c.campo} className="p-3 rounded-xl border border-border">
          <div className="text-xs text-muted-foreground">{c.label}</div>
          <div className="text-sm font-medium break-words">
            {formatarValor(dados?.[c.campo], c.tipo, c.decimais, c.mask)}
          </div>
        </div>
      ))}
    </div>
  );
}
