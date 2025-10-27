/**
 * Mapeamento de campos estruturais por tipo de elemento
 * Campos estruturais NÃO podem ser alterados em manutenções pré-projeto
 * Conforme IN 3/2025, Art. 17-19
 */

export const CAMPOS_ESTRUTURAIS = {
  placas: [
    'codigo',
    'tipo',
    'modelo',
    'dimensoes_mm',
    'substrato',
    'suporte',
    'posicao',
    'secao_suporte_mm',
    'tipo_secao_suporte',
  ],
  marcas_longitudinais: [
    'tipo_demarcacao',
    'cor',
    'posicao',
    'codigo',
    'largura_cm',
    'espessura_cm',
    'material',
  ],
  inscricoes: [
    'sigla',
    'tipo_inscricao',
    'cor',
    'dimensoes',
  ],
  tachas: [
    'tipo_tacha',
    'cor',
    'material',
    'tipo_refletivo',
  ],
  cilindros: [
    'cor_corpo',
    'cor_refletivo',
    'tipo_refletivo',
    'quantidade',
    'local_implantacao',
    'espacamento_m',
    'extensao_km',
  ],
  porticos: [
    'tipo',
    'altura_livre_m',
    'vao_horizontal_m',
    'descricao',
  ],
  defensas: [
    'classificacao_nivel_contencao',
    'nivel_contencao_en1317',
    'nivel_contencao_nchrp350',
    'funcao',
  ],
} as const;

export type TipoElemento = keyof typeof CAMPOS_ESTRUTURAIS;

export const TIPOS_ORIGEM = {
  EXECUCAO: 'execucao',
  MANUTENCAO_ROTINEIRA: 'manutencao_rotineira',
} as const;

export const LABELS_TIPO_ORIGEM = {
  execucao: 'Execução de Projeto',
  manutencao_rotineira: 'Manutenção Rotineira',
} as const;

/**
 * Verifica se um campo é estrutural para um determinado tipo de elemento
 */
export function isCampoEstrutural(tipoElemento: TipoElemento, nomeCampo: string): boolean {
  const campos = CAMPOS_ESTRUTURAIS[tipoElemento];
  if (!campos) return false;
  return (campos as readonly string[]).includes(nomeCampo);
}

/**
 * Valida se campos estruturais foram alterados em uma manutenção pré-projeto
 */
export function validarCamposEstruturais(
  tipoElemento: TipoElemento,
  tipoOrigem: string,
  camposAlterados: string[]
): { valido: boolean; violacoes: string[] } {
  if (tipoOrigem !== TIPOS_ORIGEM.MANUTENCAO_ROTINEIRA) {
    return { valido: true, violacoes: [] };
  }

  const camposEstruturais = (CAMPOS_ESTRUTURAIS[tipoElemento] || []) as readonly string[];
  const violacoes = camposAlterados.filter(campo => 
    camposEstruturais.includes(campo)
  );

  return {
    valido: violacoes.length === 0,
    violacoes,
  };
}

/**
 * Mapeamento de nomenclatura de campos entre diferentes contextos
 * Útil para entender equivalências e evitar confusões
 */
export const MAPEAMENTO_CAMPOS_PLACAS = {
  // LOCALIZAÇÃO
  br: {
    formulario: "BR",
    banco: "br",
    inventario: "br",
    fonte: "Sessão de trabalho",
    tipo: "string",
    descricao: "Número da rodovia federal"
  },
  snv: {
    formulario: "SNV",
    banco: "snv",
    inventario: "snv",
    fonte: "Sessão de trabalho / Inventário",
    tipo: "string",
    descricao: "Sistema Nacional de Viação"
  },
  km_inicial: {
    formulario: "km Inicial",
    banco: "km_inicial",
    inventario: "km_inicial",
    fonte: "Inventário / Manual",
    tipo: "numeric",
    descricao: "Quilometragem inicial da placa",
    observacao: "Padronizado - antes era 'km_referencia' em alguns lugares"
  },
  latitude_inicial: {
    formulario: "Latitude",
    banco: "latitude_inicial",
    inventario: "latitude",
    fonte: "Captura GPS / EXIF foto",
    tipo: "numeric",
    descricao: "Coordenada de latitude"
  },
  longitude_inicial: {
    formulario: "Longitude",
    banco: "longitude_inicial",
    inventario: "longitude",
    fonte: "Captura GPS / EXIF foto",
    tipo: "numeric",
    descricao: "Coordenada de longitude"
  },
  velocidade: {
    formulario: "Velocidade (km/h)",
    banco: "velocidade",
    inventario: "velocidade",
    fonte: "Inventário / Manual",
    tipo: "string",
    descricao: "Velocidade regulamentada no local"
  },

  // IDENTIFICAÇÃO DA PLACA
  tipo_placa: {
    formulario: "Tipo da Placa",
    banco: "tipo",
    inventario: "tipo",
    fonte: "Inventário / Seleção manual",
    tipo: "string",
    descricao: "Categoria da placa (regulamentação, advertência, etc.)",
    estrutural: true
  },
  codigo_placa: {
    formulario: "Código da Placa",
    banco: "codigo",
    inventario: "codigo",
    fonte: "Inventário / Seleção manual",
    tipo: "string",
    descricao: "Código normalizado da placa (ex: R-19, A-21a)",
    estrutural: true
  },
  modelo: {
    formulario: "Modelo",
    banco: "modelo",
    inventario: "modelo",
    fonte: "Inventário / Manual",
    tipo: "string",
    descricao: "Modelo específico da placa",
    estrutural: true
  },
  posicao: {
    formulario: "Posição",
    banco: "posicao",
    inventario: "posicao",
    fonte: "Inventário / Manual",
    tipo: "string",
    descricao: "Posição da placa em relação à pista",
    observacao: "Anteriormente chamado 'lado' em alguns contextos",
    valores: ["Lateral Direita", "Lateral Esquerda", "Sobre a Pista", "Canteiro Central"],
    estrutural: true
  },
  detalhamento_pagina: {
    formulario: "Página de Detalhamento",
    banco: "detalhamento_pagina",
    inventario: "detalhamento_pagina",
    fonte: "Manual",
    tipo: "integer",
    descricao: "Referência à página do manual de sinalização"
  },

  // SUPORTE
  suporte: {
    formulario: "Suporte",
    banco: "suporte",
    inventario: "suporte",
    fonte: "Inventário / Manual",
    tipo: "string",
    descricao: "Tipo de estrutura de sustentação (poste simples, duplo, pórtico, etc.)",
    estrutural: true
  },
  substrato_suporte: {
    formulario: "Substrato do Suporte",
    banco: "substrato_suporte",
    inventario: "substrato_suporte",
    fonte: "Inventário / Manual",
    tipo: "string",
    descricao: "Material do suporte (aço galvanizado, concreto, etc.)",
    observacao: "Diferente de 'suporte' - este é o MATERIAL, aquele é o TIPO"
  },
  qtde_suporte: {
    formulario: "Quantidade de Suportes",
    banco: "qtde_suporte",
    inventario: "qtde_suporte",
    fonte: "Manual",
    tipo: "integer",
    descricao: "Número de suportes que sustentam a placa"
  },
  tipo_secao_suporte: {
    formulario: "Tipo de Seção",
    banco: "tipo_secao_suporte",
    inventario: "tipo_secao_suporte",
    fonte: "Inventário / Manual",
    tipo: "string",
    descricao: "Geometria da seção do suporte (circular, quadrada, etc.)",
    estrutural: true
  },
  secao_suporte_mm: {
    formulario: "Seção do Suporte (mm)",
    banco: "secao_suporte_mm",
    inventario: "secao_suporte_mm",
    fonte: "Inventário / Manual",
    tipo: "string",
    descricao: "Dimensões da seção do suporte",
    estrutural: true
  },

  // DIMENSÕES
  dimensoes_mm: {
    formulario: "Dimensões (mm)",
    banco: "dimensoes_mm",
    inventario: "dimensoes_mm",
    fonte: "Inventário / Manual",
    tipo: "string",
    descricao: "Dimensões da placa em formato texto (ex: '600x600')",
    estrutural: true
  },
  largura_m: {
    formulario: "Largura (m)",
    banco: "largura_m",
    inventario: "largura_m",
    fonte: "Inventário / Manual",
    tipo: "numeric",
    descricao: "Largura da placa em metros"
  },
  altura_m: {
    formulario: "Altura (m)",
    banco: "altura_m",
    inventario: "altura_m",
    fonte: "Inventário / Manual",
    tipo: "numeric",
    descricao: "Altura da placa em metros"
  },
  area_m2: {
    formulario: "Área (m²)",
    banco: "area_m2",
    inventario: "area_m2",
    fonte: "Calculado / Manual",
    tipo: "numeric",
    descricao: "Área total da placa"
  },

  // CHAPA DA PLACA
  substrato: {
    formulario: "Tipo de Substrato (Chapa)",
    banco: "substrato",
    inventario: "substrato",
    fonte: "Inventário / Manual",
    tipo: "string",
    descricao: "Material da chapa da placa (aço, alumínio, etc.)",
    estrutural: true
  },
  si_sinal_impresso: {
    formulario: "SI - Sinal Impresso",
    banco: "si_sinal_impresso",
    inventario: "si_sinal_impresso",
    fonte: "Manual",
    tipo: "string",
    descricao: "Indicador se é sinal impresso ou não"
  },

  // PELÍCULAS
  tipo_pelicula_fundo: {
    formulario: "Tipo Película Fundo",
    banco: "tipo_pelicula_fundo",
    inventario: "tipo_pelicula_fundo",
    fonte: "Manual",
    tipo: "string",
    descricao: "Tipo de película refletiva do fundo"
  },
  cor_pelicula_fundo: {
    formulario: "Cor Película Fundo",
    banco: "cor_pelicula_fundo",
    inventario: "cor_pelicula_fundo",
    fonte: "Manual",
    tipo: "string",
    descricao: "Cor da película do fundo"
  },
  retro_pelicula_fundo: {
    formulario: "Retrorrefletância Fundo",
    banco: "retro_pelicula_fundo",
    inventario: "retro_pelicula_fundo",
    fonte: "Manual / Medição",
    tipo: "numeric",
    descricao: "Índice de retrorrefletância da película do fundo"
  },
  tipo_pelicula_legenda_orla: {
    formulario: "Tipo Película Legenda/Orla",
    banco: "tipo_pelicula_legenda_orla",
    inventario: "tipo_pelicula_legenda_orla",
    fonte: "Manual",
    tipo: "string",
    descricao: "Tipo de película das legendas/orlas"
  },
  cor_pelicula_legenda_orla: {
    formulario: "Cor Película Legenda/Orla",
    banco: "cor_pelicula_legenda_orla",
    inventario: "cor_pelicula_legenda_orla",
    fonte: "Manual",
    tipo: "string",
    descricao: "Cor da película das legendas/orlas"
  },
  retro_pelicula_legenda_orla: {
    formulario: "Retrorrefletância Legenda/Orla",
    banco: "retro_pelicula_legenda_orla",
    inventario: "retro_pelicula_legenda_orla",
    fonte: "Manual / Medição",
    tipo: "numeric",
    descricao: "Índice de retrorrefletância da legenda/orla"
  },
} as const;

/**
 * Utilitário para buscar informações de um campo
 */
export function getInfoCampo(nomeCampo: keyof typeof MAPEAMENTO_CAMPOS_PLACAS) {
  return MAPEAMENTO_CAMPOS_PLACAS[nomeCampo];
}

/**
 * Utilitário para listar campos estruturais com suas informações completas
 */
export function getCamposEstruturaisComInfo() {
  return Object.entries(MAPEAMENTO_CAMPOS_PLACAS)
    .filter(([_, info]) => 'estrutural' in info && info.estrutural)
    .map(([campo, info]) => ({
      campo,
      ...info
    }));
}
