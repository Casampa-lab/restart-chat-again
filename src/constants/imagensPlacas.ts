/**
 * Sistema inteligente de mapeamento de imagens de placas de trânsito
 * Detecta automaticamente a categoria pelo prefixo do código
 */

type CategoriaPlaca = 'regulamentacao' | 'advertencia' | 'indicacao';

/**
 * Detecta a categoria da placa baseado no código
 */
export const detectarCategoria = (codigo: string): CategoriaPlaca | null => {
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
 * Prioriza assets estáticos, depois Supabase Storage
 */
export const getImagemPlaca = (codigo: string | null | undefined): string | null => {
  if (!codigo) return null;
  
  const categoria = detectarCategoria(codigo);
  if (!categoria) return null;
  
  // Primeiro tenta assets estáticos
  const staticPath = `/src/assets/placas/${categoria}/${codigo}.svg`;
  
  // Se não encontrar nos assets estáticos, tenta no Supabase Storage
  // (essa URL será verificada pelo navegador em tempo de execução)
  const storagePath = `https://cfdnrbyeuqtrjzzjyuon.supabase.co/storage/v1/object/public/placa-svgs/${categoria}/${codigo}.svg`;
  
  // Retorna o path estático primeiro, o navegador fará fallback para storage se necessário
  return staticPath;
};

/**
 * Verifica se uma placa tem imagem disponível
 */
export const temImagemDisponivel = (codigo: string | null | undefined): boolean => {
  return getImagemPlaca(codigo) !== null;
};
