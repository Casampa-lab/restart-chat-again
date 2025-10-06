/**
 * Configuração central de planilhas do sistema BR-LEGAL 2
 * 
 * Esta estrutura permite adicionar novas planilhas de forma modular.
 * Cada planilha deve ter:
 * - Um identificador único (código)
 * - Nome descritivo
 * - Categoria (para organização no menu)
 * - Status de implementação
 */

export interface Planilha {
  codigo: string;
  nome: string;
  categoria: 'sinalizacao' | 'conservacao' | 'seguranca' | 'outros';
  implementado: boolean;
  descricao: string;
  tabela?: string; // Nome da tabela no banco (quando implementado)
}

export const PLANILHAS: Record<string, Planilha> = {
  // Implementado
  '2.3': {
    codigo: '2.3',
    nome: 'Não-Conformidades',
    categoria: 'sinalizacao',
    implementado: true,
    descricao: 'Registro de não-conformidades identificadas',
    tabela: 'nao_conformidades'
  },

  // A implementar
  '2.2': {
    codigo: '2.2',
    nome: 'Condições de Sinalização',
    categoria: 'sinalizacao',
    implementado: false,
    descricao: 'Avaliação das condições da sinalização viária'
  },
  
  '3.1.2': {
    codigo: '3.1.2',
    nome: 'Conservação de Pavimento',
    categoria: 'conservacao',
    implementado: false,
    descricao: 'Registro de condições e manutenção do pavimento'
  },
  
  '3.1.3.1': {
    codigo: '3.1.3.1',
    nome: 'Limpeza e Conservação - Faixa de Domínio',
    categoria: 'conservacao',
    implementado: false,
    descricao: 'Controle de limpeza da faixa de domínio'
  },
  
  '3.1.3.2': {
    codigo: '3.1.3.2',
    nome: 'Limpeza e Conservação - Dispositivos',
    categoria: 'conservacao',
    implementado: false,
    descricao: 'Limpeza de placas, defensas e dispositivos'
  },
  
  '3.1.4': {
    codigo: '3.1.4',
    nome: 'Drenagem e Obras de Arte',
    categoria: 'conservacao',
    implementado: false,
    descricao: 'Inspeção de drenagem e obras de arte'
  },
};

export const CATEGORIAS_PLANILHAS = {
  sinalizacao: 'Sinalização',
  conservacao: 'Conservação',
  seguranca: 'Segurança Viária',
  outros: 'Outros'
} as const;

// Helper para obter planilhas por categoria
export const getPlanilhasPorCategoria = (categoria: keyof typeof CATEGORIAS_PLANILHAS) => {
  return Object.values(PLANILHAS).filter(p => p.categoria === categoria);
};

// Helper para obter apenas planilhas implementadas
export const getPlanilhasImplementadas = () => {
  return Object.values(PLANILHAS).filter(p => p.implementado);
};