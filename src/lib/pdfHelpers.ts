/**
 * Helper functions for PDF generation
 */

/**
 * Converte URL remota (Supabase Storage) para base64 data URL
 */
export async function urlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Erro ao converter URL para base64:', error);
    throw error;
  }
}

/**
 * Extrai base64 puro de data URL
 */
export function extractBase64(dataUrl: string): string {
  return dataUrl.split(',')[1];
}

/**
 * Detecta formato da imagem
 */
export function getImageFormat(dataUrl: string): 'PNG' | 'JPEG' {
  return dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
}
