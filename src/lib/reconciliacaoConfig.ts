// Configuração centralizada do sistema de reconciliação para todos os grupos

export type GrupoElemento = 
  | 'placas' 
  | 'defensas' 
  | 'porticos' 
  | 'marcas_longitudinais' 
  | 'inscricoes' 
  | 'cilindros' 
  | 'tachas';

export interface ReconciliacaoConfig {
  tabelaNecessidades: string;
  tabelaCadastro: string;
  labelGrupo: string;
  camposComparacao: string[];
  iconeProjeto: string;
  iconeCadastro: string;
}

export const RECONCILIACAO_CONFIG: Record<GrupoElemento, ReconciliacaoConfig> = {
  placas: {
    tabelaNecessidades: 'necessidades_placas',
    tabelaCadastro: 'ficha_placa',
    labelGrupo: 'Placas de Sinalização',
    camposComparacao: ['codigo', 'tipo', 'lado', 'suporte', 'substrato', 'km'],
    iconeProjeto: '🚏',
    iconeCadastro: '📷',
  },
  defensas: {
    tabelaNecessidades: 'necessidades_defensas',
    tabelaCadastro: 'defensas',
    labelGrupo: 'Defensas Metálicas',
    camposComparacao: ['tipo_defensa', 'extensao_metros', 'lado', 'km_inicial', 'km_final'],
    iconeProjeto: '🛣️',
    iconeCadastro: '📷',
  },
  porticos: {
    tabelaNecessidades: 'necessidades_porticos',
    tabelaCadastro: 'ficha_porticos',
    labelGrupo: 'Pórticos',
    camposComparacao: ['tipo', 'vao_horizontal_m', 'altura_livre_m', 'km'],
    iconeProjeto: '🌉',
    iconeCadastro: '📷',
  },
  marcas_longitudinais: {
    tabelaNecessidades: 'necessidades_marcas_longitudinais',
    tabelaCadastro: 'ficha_marcas_longitudinais',
    labelGrupo: 'Marcas Longitudinais',
    camposComparacao: ['tipo_demarcacao', 'cor', 'largura_cm', 'km_inicial', 'km_final'],
    iconeProjeto: '➖',
    iconeCadastro: '📷',
  },
  inscricoes: {
    tabelaNecessidades: 'necessidades_marcas_transversais',
    tabelaCadastro: 'ficha_inscricoes',
    labelGrupo: 'Inscrições/Setas',
    camposComparacao: ['sigla', 'tipo_inscricao', 'cor', 'area_m2', 'km_inicial'],
    iconeProjeto: '➡️',
    iconeCadastro: '📷',
  },
  cilindros: {
    tabelaNecessidades: 'necessidades_cilindros',
    tabelaCadastro: 'ficha_cilindros',
    labelGrupo: 'Cilindros',
    camposComparacao: ['cor_corpo', 'cor_refletivo', 'quantidade', 'km_inicial'],
    iconeProjeto: '🔴',
    iconeCadastro: '📷',
  },
  tachas: {
    tabelaNecessidades: 'necessidades_tachas',
    tabelaCadastro: 'ficha_tachas',
    labelGrupo: 'Tachas Refletivas',
    camposComparacao: ['tipo_tacha', 'cor', 'lado', 'quantidade', 'km_inicial'],
    iconeProjeto: '💎',
    iconeCadastro: '📷',
  },
};

// Mapeamento de nomes legíveis para campos técnicos
export const CAMPO_LABELS: Record<string, string> = {
  codigo: 'Código',
  tipo: 'Tipo',
  tipo_defensa: 'Tipo de Defensa',
  tipo_demarcacao: 'Tipo de Demarcação',
  tipo_inscricao: 'Tipo de Inscrição',
  tipo_tacha: 'Tipo de Tacha',
  lado: 'Lado',
  suporte: 'Suporte',
  substrato: 'Substrato',
  km: 'KM',
  km_inicial: 'KM Inicial',
  km_final: 'KM Final',
  extensao_metros: 'Extensão (m)',
  vao_horizontal_m: 'Vão Horizontal (m)',
  altura_livre_m: 'Altura Livre (m)',
  cor: 'Cor',
  cor_corpo: 'Cor do Corpo',
  cor_refletivo: 'Cor Refletivo',
  largura_cm: 'Largura (cm)',
  area_m2: 'Área (m²)',
  quantidade: 'Quantidade',
  sigla: 'Sigla',
};

export function getConfig(tipo: GrupoElemento): ReconciliacaoConfig {
  return RECONCILIACAO_CONFIG[tipo];
}

export function getTabelaNecessidades(tipo: GrupoElemento): string {
  return RECONCILIACAO_CONFIG[tipo].tabelaNecessidades;
}

export function getTabelaCadastro(tipo: GrupoElemento): string {
  return RECONCILIACAO_CONFIG[tipo].tabelaCadastro;
}

export function formatarCampo(campo: string, valor: any): string {
  if (valor === null || valor === undefined) return 'N/A';
  
  // Formatação especial para campos numéricos
  if (typeof valor === 'number') {
    if (campo.includes('km')) return valor.toFixed(3);
    if (campo.includes('_m') || campo.includes('metros')) return valor.toFixed(2) + 'm';
    if (campo.includes('_cm')) return valor.toFixed(1) + 'cm';
    if (campo.includes('m2')) return valor.toFixed(2) + 'm²';
    return valor.toString();
  }
  
  return String(valor);
}