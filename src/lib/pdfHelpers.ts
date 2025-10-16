/**
 * Helper functions for PDF generation
 */

/**
 * Converte URL remota (Supabase Storage) para base64 data URL
 */
export async function urlToBase64(url: string): Promise<string> {
  console.log('🔄 Iniciando conversão de imagem:', url);
  
  try {
    // Adicionar timeout de 10 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    console.log('📥 Status HTTP:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log('📦 Blob recebido:', blob.size, 'bytes | Tipo:', blob.type);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        console.log('✅ Base64 gerado com sucesso:', result.substring(0, 50) + '...');
        resolve(result);
      };
      reader.onerror = (error) => {
        console.error('❌ Erro no FileReader:', error);
        reject(error);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('❌ Erro completo ao converter URL para base64:', error);
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
