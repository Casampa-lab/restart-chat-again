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
