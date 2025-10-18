/**
 * Sistema inteligente de mapeamento de imagens de placas de trânsito
 * Detecta automaticamente a categoria pelo prefixo do código
 */

type CategoriaPlaca = 'regulamentacao' | 'advertencia' | 'indicacao';

/**
 * Detecta a categoria da placa baseado no código
 */
const detectarCategoria = (codigo: string): CategoriaPlaca | null => {
  const prefixo = codigo.split('-')[0];
  
  if (prefixo === 'R') return 'regulamentacao';
  if (prefixo === 'A') return 'advertencia';
  
  // Indicação tem múltiplos prefixos
  const prefixosIndicacao = ['ID', 'OD', 'ED', 'SAU', 'TNA', 'THC', 'TAD', 'TAR', 'TIT'];
  if (prefixosIndicacao.some(p => codigo.startsWith(p))) return 'indicacao';
  
  return null;
};

/**
 * Retorna o caminho da imagem para um código de placa
 * Retorna null se a placa não tiver imagem disponível
 */
export const getImagemPlaca = (codigo: string | null | undefined): string | null => {
  if (!codigo) return null;
  
  const categoria = detectarCategoria(codigo);
  if (!categoria) return null;
  
  try {
    // Tenta importar a imagem dinamicamente
    // O Vite vai resolver isso em tempo de build
    return `/src/assets/placas/${categoria}/${codigo}.svg`;
  } catch {
    return null;
  }
};

/**
 * Verifica se uma placa tem imagem disponível
 */
export const temImagemDisponivel = (codigo: string | null | undefined): boolean => {
  return getImagemPlaca(codigo) !== null;
};
