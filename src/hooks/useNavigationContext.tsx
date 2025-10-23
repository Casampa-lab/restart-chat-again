import { useNavigate } from "react-router-dom";

/**
 * Hook para gerenciar contexto de navegação entre modo campo e desktop
 * Detecta automaticamente o modo ativo e fornece navegação contextual
 */
export const useNavigationContext = () => {
  const modoAcesso = localStorage.getItem('modoAcesso');
  const isMobile = modoAcesso === 'campo';
  
  /**
   * Navega de volta para a página inicial do contexto correto
   * - Modo Campo: volta para /modo-campo
   * - Modo Desktop: volta para /
   */
  const navigateBack = (navigate: ReturnType<typeof useNavigate>) => {
    if (isMobile) {
      navigate('/modo-campo');
    } else {
      navigate('/');
    }
  };
  
  return { isMobile, navigateBack };
};
