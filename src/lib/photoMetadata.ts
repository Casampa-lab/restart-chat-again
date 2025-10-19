import EXIF from 'exif-js';

/**
 * Extrai a data de uma foto usando metadados EXIF
 * @param file - Arquivo de imagem
 * @returns Promise com a data no formato YYYY-MM-DD ou null se não encontrar
 */
export async function extractPhotoDate(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const img = new Image();
      img.src = e.target?.result as string;
      
      img.onload = function() {
        EXIF.getData(img as any, function(this: any) {
          // Tentar obter a data original
          const dateTimeOriginal = EXIF.getTag(this, "DateTimeOriginal");
          const dateTime = EXIF.getTag(this, "DateTime");
          const dateTimeDigitized = EXIF.getTag(this, "DateTimeDigitized");
          
          // Usar a primeira data disponível
          const exifDate = dateTimeOriginal || dateTime || dateTimeDigitized;
          
          if (exifDate) {
            try {
              // EXIF data format: "YYYY:MM:DD HH:MM:SS"
              const [datePart] = exifDate.split(' ');
              const formattedDate = datePart.replace(/:/g, '-');
              resolve(formattedDate);
            } catch (error) {
              console.error("Erro ao processar data EXIF:", error);
              resolve(null);
            }
          } else {
            // Se não tem EXIF, tentar usar lastModified do arquivo
            try {
              const fileDate = new Date(file.lastModified);
              const formattedDate = fileDate.toISOString().split('T')[0];
              resolve(formattedDate);
            } catch (error) {
              resolve(null);
            }
          }
        });
      };
      
      img.onerror = function() {
        resolve(null);
      };
    };
    
    reader.onerror = function() {
      resolve(null);
    };
    
    reader.readAsDataURL(file);
  });
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
 * Converte coordenadas DMS (Degrees, Minutes, Seconds) para DD (Decimal Degrees)
 */
function convertDMSToDD(dms: number[], ref: string): number {
  const degrees = dms[0];
  const minutes = dms[1];
  const seconds = dms[2];
  
  let dd = degrees + minutes / 60 + seconds / 3600;
  
  // Se for Sul ou Oeste, tornar negativo
  if (ref === 'S' || ref === 'W') {
    dd = dd * -1;
  }
  
  return dd;
}

/**
 * Extrai coordenadas GPS de uma foto usando metadados EXIF
 * @param file - Arquivo de imagem
 * @returns Promise com { latitude, longitude } ou null
 */
export async function extractGPSFromPhoto(file: File): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const img = new Image();
      img.src = e.target?.result as string;
      
      img.onload = function() {
        EXIF.getData(img as any, function(this: any) {
          const lat = EXIF.getTag(this, "GPSLatitude");
          const latRef = EXIF.getTag(this, "GPSLatitudeRef");
          const lon = EXIF.getTag(this, "GPSLongitude");
          const lonRef = EXIF.getTag(this, "GPSLongitudeRef");
          
          if (lat && lon && latRef && lonRef) {
            try {
              // Converter de formato DMS (graus, minutos, segundos) para decimal
              const latitude = convertDMSToDD(lat, latRef);
              const longitude = convertDMSToDD(lon, lonRef);
              resolve({ latitude, longitude });
            } catch (error) {
              console.error("Erro ao processar GPS EXIF:", error);
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      };
      
      img.onerror = () => resolve(null);
    };
    
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * Captura GPS do dispositivo usando Geolocation API
 * @returns Promise com { latitude, longitude } ou null
 */
export async function getCurrentGPS(): Promise<{ latitude: number; longitude: number } | null> {
  if (!navigator.geolocation) {
    console.warn("Geolocation não suportada");
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
