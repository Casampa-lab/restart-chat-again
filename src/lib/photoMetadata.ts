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
