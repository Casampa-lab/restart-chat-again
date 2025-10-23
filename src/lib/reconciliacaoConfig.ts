// Configuração centralizada do sistema de reconciliação para todos os grupos
// 
// IMPORTANTE: Diferenciação entre Reconciliação e Intervenção
// ============================================================
// 
// 1. RECONCILIAÇÃO (via ReconciliacaoDrawerUniversal):
//    - Cria NOVO elemento no inventário com origem = 'necessidade' (contador ROXO)
//    - Desativa elemento antigo se houver match (ativo = false)
//    - Usado quando há match GPS entre necessidade e cadastro
//    - Workflow: Técnico solicita → Coordenador aprova → Novo elemento criado
// 
// 2. INTERVENÇÃO ESTRUTURAL (via IntervençõesForm → aplicar_intervencao_*):
//    - ATUALIZA elemento existente no inventário
//    - Define modificado_por_intervencao = true
//    - Define tipo_origem = 'execucao' ou 'manutencao_pre_projeto'
//    - Usado para registrar modificações em campo (danos, manutenções)
//    - Workflow: Técnico registra → Coordenador aprova → Histórico criado
// 
// Contadores do Inventário Dinâmico:
// -----------------------------------
// PRÉ-MARCO ZERO (3 bolas):
//   - AZUL: cadastro_inicial + ativo=true (diminui quando substituído)
//   - ROXO: origem='necessidade' + ativo=true (aumenta na reconciliação)
//   - VERDE: necessidades não matcheadas (diminui na reconciliação)
// 
// PÓS-MARCO ZERO (1 bola):
//   - CYAN: total ativo=true (todos os elementos ativos no inventário)

export type GrupoElemento =
  | "placas"
  | "defensas"
  | "porticos"
  | "marcas_longitudinais"
  | "inscricoes"
  | "cilindros"
  | "tachas";

export interface ReconciliacaoConfig {
  tabelaNecessidades: string;
  tabelaCadastro: string;
  labelGrupo: string;
  camposComparacao: string[];
  iconeProjeto: string;
  iconeCadastro: string;
  tipoGeometria: "linear" | "pontual";
  recorrente: boolean;
  toleranciaPadraoMetros: number;
  colunaTolerancia: string;
}

export const RECONCILIACAO_CONFIG: Record<GrupoElemento, ReconciliacaoConfig> = {
  placas: {
    tabelaNecessidades: "necessidades_placas",
    tabelaCadastro: "ficha_placa",
    labelGrupo: "Placas de Sinalização",
    camposComparacao: ["codigo", "tipo", "lado", "suporte", "substrato", "km"],
    iconeProjeto: "🚏",
    iconeCadastro: "📷",
    tipoGeometria: "pontual",
    recorrente: false,
    toleranciaPadraoMetros: 50,
    colunaTolerancia: "tolerancia_placas_metros",
  },
  defensas: {
    tabelaNecessidades: "necessidades_defensas",
    tabelaCadastro: "defensas",
    labelGrupo: "Defensas Metálicas",
    camposComparacao: [
      "lado",
      "funcao",
      "especificacao_obstaculo_fixo",
      "nivel_contencao_en1317",
      "nivel_contencao_nchrp350",
      "geometria",
      "extensao_metros",
      "km_inicial",
      "km_final",
    ],
    iconeProjeto: "🛣️",
    iconeCadastro: "📷",
    tipoGeometria: "linear",
    recorrente: false,
    toleranciaPadraoMetros: 20,
    colunaTolerancia: "tolerancia_defensas_metros",
  },
  porticos: {
    tabelaNecessidades: "necessidades_porticos",
    tabelaCadastro: "ficha_porticos",
    labelGrupo: "Pórticos",
    camposComparacao: ["tipo", "lado", "vao_horizontal_m", "altura_livre_m", "km"],
    iconeProjeto: "🌉",
    iconeCadastro: "📷",
    tipoGeometria: "pontual",
    recorrente: false,
    toleranciaPadraoMetros: 200,
    colunaTolerancia: "tolerancia_porticos_metros",
  },
  marcas_longitudinais: {
    tabelaNecessidades: "necessidades_marcas_longitudinais",
    tabelaCadastro: "ficha_marcas_longitudinais",
    labelGrupo: "Marcas Longitudinais",
    camposComparacao: ["tipo_demarcacao", "cor", "largura_cm", "km_inicial", "km_final"],
    iconeProjeto: "➖",
    iconeCadastro: "📷",
    tipoGeometria: "linear",
    recorrente: true,
    toleranciaPadraoMetros: 20,
    colunaTolerancia: "tolerancia_marcas_metros",
  },
  inscricoes: {
    tabelaNecessidades: "necessidades_marcas_transversais",
    tabelaCadastro: "ficha_inscricoes",
    labelGrupo: "Inscrições/Setas",
    camposComparacao: ["sigla", "tipo_inscricao", "cor", "area_m2", "km_inicial"],
    iconeProjeto: "➡️",
    iconeCadastro: "📷",
    tipoGeometria: "pontual",
    recorrente: true,
    toleranciaPadraoMetros: 30,
    colunaTolerancia: "tolerancia_inscricoes_metros",
  },
  cilindros: {
    tabelaNecessidades: "necessidades_cilindros",
    tabelaCadastro: "ficha_cilindros",
    labelGrupo: "Cilindros",
    camposComparacao: [
      "local_implantacao",
      "cor_corpo",
      "cor_refletivo",
      "tipo_refletivo",
      "quantidade",
      "km_inicial",
      "km_final",
    ],
    iconeProjeto: "🔴",
    iconeCadastro: "📷",
    tipoGeometria: "linear",
    recorrente: true,
    toleranciaPadraoMetros: 25,
    colunaTolerancia: "tolerancia_cilindros_metros",
  },
  tachas: {
    tabelaNecessidades: "necessidades_tachas",
    tabelaCadastro: "ficha_tachas",
    labelGrupo: "Tachas Refletivas",
    camposComparacao: [
      "local_implantacao",
      "corpo",
      "refletivo",
      "cor_refletivo",
      "quantidade",
      "km_inicial",
      "km_final",
    ],
    iconeProjeto: "💎",
    iconeCadastro: "📷",
    tipoGeometria: "linear",
    recorrente: true,
    toleranciaPadraoMetros: 25,
    colunaTolerancia: "tolerancia_tachas_metros",
  },
};

// Mapeamento de nomes legíveis para campos técnicos
export const CAMPO_LABELS: Record<string, string> = {
  codigo: "Código",
  tipo: "Tipo",
  tipo_demarcacao: "Tipo de Demarcação",
  tipo_inscricao: "Tipo de Inscrição",
  tipo_tacha: "Tipo de Tacha",
  lado: "Lado",
  suporte: "Tipo de Suporte",
  tipo_suporte: "Tipo de Suporte",
  substrato: "Substrato",
  km: "KM",
  km_inicial: "KM Inicial",
  km_final: "KM Final",
  extensao_metros: "Extensão (m)",
  vao_horizontal_m: "Vão Horizontal (m)",
  altura_livre_m: "Altura Livre (m)",
  cor: "Cor",
  cor_corpo: "Cor do Corpo",
  cor_refletivo: "Cor Refletivo",
  largura_cm: "Largura (cm)",
  area_m2: "Área (m²)",
  quantidade: "Quantidade",
  sigla: "Sigla",
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

export function isRecorrente(tipo: GrupoElemento): boolean {
  return RECONCILIACAO_CONFIG[tipo].recorrente;
}

export function getTipoGeometria(tipo: GrupoElemento): "linear" | "pontual" {
  return RECONCILIACAO_CONFIG[tipo].tipoGeometria;
}

export function getComportamentoServico(tipo: GrupoElemento): string {
  const config = RECONCILIACAO_CONFIG[tipo];
  const geometria = config.tipoGeometria === "linear" ? "por extensão" : "pontual";
  const recorrencia = config.recorrente
    ? "substituição automática por desgaste natural"
    : "avaliação manual de danos específicos";
  return `Matching ${geometria}, ${recorrencia}`;
}

export function getColunaTolerancia(tipo: GrupoElemento): string {
  return RECONCILIACAO_CONFIG[tipo].colunaTolerancia;
}

export function formatarCampo(campo: string, valor: any): string {
  if (valor === null || valor === undefined) return "N/A";

  // Formatação especial para campos numéricos
  if (typeof valor === "number") {
    if (campo.includes("km")) return valor.toFixed(3);
    if (campo.includes("_m") || campo.includes("metros")) return valor.toFixed(2) + "m";
    if (campo.includes("_cm")) return valor.toFixed(1) + "cm";
    if (campo.includes("m2")) return valor.toFixed(2) + "m²";
    return valor.toString();
  }

  return String(valor);
}

/**
 * Retorna descrição legível da origem do elemento no inventário
 */
export function getOrigemDescricao(origem?: string, modificadoPorIntervencao?: boolean): string {
  if (modificadoPorIntervencao) {
    return "🔧 Modificado por Intervenção";
  }
  
  switch (origem) {
    case 'cadastro_inicial':
      return "📋 Cadastro Inicial";
    case 'necessidade':
      return "🔄 Criado por Reconciliação";
    case 'execucao':
      return "⚙️ Execução de Projeto";
    case 'manutencao_pre_projeto':
      return "🛠️ Manutenção Pré-Projeto";
    default:
      return "❓ Origem Desconhecida";
  }
}

/**
 * Retorna cor do badge baseado na origem
 */
export function getOrigemBadgeVariant(origem?: string): "default" | "secondary" | "destructive" | "outline" {
  switch (origem) {
    case 'cadastro_inicial':
      return "secondary";
    case 'necessidade':
      return "default";
    case 'execucao':
    case 'manutencao_pre_projeto':
      return "outline";
    default:
      return "outline";
  }
}
