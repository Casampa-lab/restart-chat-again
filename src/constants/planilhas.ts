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
  categoria: 'sinalizacao' | 'conservacao' | 'seguranca' | 'intervencoes' | 'inspecao' | 'outros';
  implementado: boolean;
  descricao: string;
  tabela?: string; // Nome da tabela no banco (quando implementado)
}

export const PLANILHAS: Record<string, Planilha> = {
  // Implementado
  '2.2': {
    codigo: '2.2',
    nome: 'FRENTE LIBERADA DAS RODOVIAS',
    categoria: 'outros',
    implementado: true,
    descricao: 'Registro de frentes liberadas para trabalho nas rodovias',
    tabela: 'frentes_liberadas'
  },

  '2.3': {
    codigo: '2.3',
    nome: 'CONTROLE DE NÃO-CONFORMIDADE',
    categoria: 'inspecao',
    implementado: true,
    descricao: 'Controle de não-conformidades identificadas',
    tabela: 'nao_conformidades'
  },

  '3.1.3.1': {
    codigo: '3.1.3.1',
    nome: 'RETRORREFLETIVIDADE ESTÁTICA',
    categoria: 'sinalizacao',
    implementado: true,
    descricao: 'Medição de retrorrefletividade estática da sinalização',
    tabela: 'retrorrefletividade_estatica'
  },

  '3.1.3.2': {
    codigo: '3.1.3.2',
    nome: 'RETRORREFLETIVIDADE DINÂMICA',
    categoria: 'sinalizacao',
    implementado: true,
    descricao: 'Medição de retrorrefletividade dinâmica da sinalização',
    tabela: 'retrorrefletividade_dinamica'
  },

  '3.1.4': {
    codigo: '3.1.4',
    nome: 'DEFENSAS',
    categoria: 'seguranca',
    implementado: true,
    descricao: 'Inspeção e controle de defensas metálicas',
    tabela: 'defensas'
  },

  // A implementar

  '3.1.5-inscricoes': {
    codigo: '3.1.5',
    nome: 'INTERVENÇÕES REALIZADAS - INSCRIÇÕES NOS PAVIMENTOS',
    categoria: 'intervencoes',
    implementado: false,
    descricao: 'Registro de intervenções realizadas em inscrições no pavimento'
  },

  '3.1.5-sh': {
    codigo: '3.1.5',
    nome: 'INTERVENÇÕES REALIZADAS - SH',
    categoria: 'intervencoes',
    implementado: false,
    descricao: 'Registro de intervenções realizadas em sinalização horizontal'
  },

  '3.1.5-sv': {
    codigo: '3.1.5',
    nome: 'INTERVENÇÕES REALIZADAS - SV',
    categoria: 'intervencoes',
    implementado: false,
    descricao: 'Registro de intervenções realizadas em sinalização vertical'
  },

  '3.1.5-tacha': {
    codigo: '3.1.5',
    nome: 'INTERVENÇÕES REALIZADAS - TACHA',
    categoria: 'intervencoes',
    implementado: false,
    descricao: 'Registro de intervenções realizadas em tachas refletivas'
  },

  '3.1.18': {
    codigo: '3.1.18',
    nome: 'REGISTRO DE NÃO CONFORMIDADE',
    categoria: 'inspecao',
    implementado: false,
    descricao: 'Registro detalhado de não conformidades'
  },

  '3.1.19': {
    codigo: '3.1.19',
    nome: 'FICHA DE VERIFICAÇÃO',
    categoria: 'inspecao',
    implementado: false,
    descricao: 'Ficha de verificação de serviços e condições'
  },

  '3.1.20': {
    codigo: '3.1.20',
    nome: 'FICHA DE PLACA',
    categoria: 'sinalizacao',
    implementado: false,
    descricao: 'Ficha de registro e controle de placas de sinalização'
  },
};

export const CATEGORIAS_PLANILHAS = {
  sinalizacao: 'Sinalização',
  conservacao: 'Conservação',
  seguranca: 'Segurança Viária',
  intervencoes: 'Intervenções Realizadas',
  inspecao: 'Inspeção e Controle',
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
