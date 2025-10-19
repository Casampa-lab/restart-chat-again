import exifr from 'exifr';

/**
 * Extrai a data de uma foto usando metadados EXIF
 * @param file - Arquivo de imagem
 * @returns Promise com a data no formato YYYY-MM-DD ou null se não encontrar
 */
export async function extractPhotoDate(file: File): Promise<string | null> {
  try {
    // Tentar ler metadados EXIF
    const exif = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'DateTime', 'DateTimeDigitized', 'CreateDate']
    });

    if (exif) {
      // Priorizar DateTimeOriginal (data de captura real)
      const date = exif.DateTimeOriginal || exif.DateTime || exif.DateTimeDigitized || exif.CreateDate;
      
      if (date instanceof Date) {
        return date.toISOString().split('T')[0]; // Retorna YYYY-MM-DD
      }
    }
  } catch (error) {
    console.warn("Erro ao extrair data EXIF:", error);
  }

  // Fallback: usar lastModified do arquivo
  try {
    const fileDate = new Date(file.lastModified);
    return fileDate.toISOString().split('T')[0];
  } catch (error) {
    console.error("Erro ao usar lastModified:", error);
    return null;
  }
}

/**
 * Extrai a data da primeira foto em uma FileList
 * @param files - FileList ou File
 * @returns Promise com a data no formato YYYY-MM-DD ou null
 */
export async function extractDateFromPhotos(files: FileList | File | null): Promise<string | null> {
  if (!files) return null;
  
  const firstFile = files instanceof FileList ? files[0] : files;
  if (!firstFile) return null;
  
  return extractPhotoDate(firstFile);
}

/**
 * Extrai coordenadas GPS de uma foto usando metadados EXIF
 * @param file - Arquivo de imagem
 * @returns Promise com { latitude, longitude } ou null
 */
export async function extractGPSFromPhoto(file: File): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const gps = await exifr.gps(file);
    
    if (gps && gps.latitude && gps.longitude) {
      return {
        latitude: gps.latitude,
        longitude: gps.longitude
      };
    }
  } catch (error) {
    console.warn("Erro ao extrair GPS EXIF:", error);
  }
  
  return null;
}

/**
 * Captura GPS do dispositivo usando Geolocation API
 * @returns Promise com { latitude, longitude } ou null
 */
export async function getCurrentGPS(): Promise<{ latitude: number; longitude: number } | null> {
  if (!navigator.geolocation) {
    console.warn("Geolocalização não suportada");
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Erro ao obter GPS:", error);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}
