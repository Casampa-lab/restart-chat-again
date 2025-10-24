import { useState, useRef } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Camera as CameraIcon, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CameraCaptureProps {
  photos: string[];                       // ← controlado pelo parent
  onPhotosChange: (urls: string[]) => void;
  maxPhotos?: number;
  bucketName?: string;
}

export function CameraCapture({ 
  photos,
  onPhotosChange, 
  maxPhotos = 5,
  bucketName = 'intervencoes-fotos'
}: CameraCaptureProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isNative = Capacitor.isNativePlatform();

  // Comprimir DataURL para reduzir tamanho
  async function compressDataUrlToJpeg(dataUrl: string, quality = 0.85): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context null'));
        ctx.drawImage(img, 0, 0);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  const takePicture = async () => {
    if (photos.length >= maxPhotos) {
      toast.error(`Máximo de ${maxPhotos} fotos atingido`);
      return;
    }

    // Se está na web, usar input file
    if (!isNative) {
      fileInputRef.current?.click();
      return;
    }

    try {
      // Verificar permissões (apenas nativo)
      const permission = await Camera.checkPermissions();
      
      if (permission.camera !== 'granted') {
        const request = await Camera.requestPermissions({ permissions: ['camera'] });
        if (request.camera !== 'granted') {
          throw new Error('Permissão de câmera negada');
        }
      }

      // Capturar foto
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (!image.dataUrl) {
        throw new Error('Erro ao capturar imagem');
      }

      await uploadPhoto(image.dataUrl);
    } catch (error: any) {
      console.error('Erro ao capturar foto:', error);
      toast.error('Erro ao capturar foto: ' + error.message);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (photos.length >= maxPhotos) {
      toast.error(`Máximo de ${maxPhotos} fotos atingido`);
      return;
    }

    try {
      // Converter para DataUrl
      const reader = new FileReader();
      reader.onloadend = async () => {
        await uploadPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Erro ao processar foto:', error);
      toast.error('Erro ao processar foto');
    }
  };

  const uploadPhoto = async (dataUrl: string) => {
    console.log('🔍 [CameraCapture] Iniciando upload', {
      dataUrlLength: dataUrl?.length ?? 0,
      fotosAtuais: photos.length,
      maxPhotos,
    });

    try {
      setUploading(true);

      // Comprimir imagem
      console.log('🖼️ [CameraCapture] Comprimindo imagem...');
      const compressed = await compressDataUrlToJpeg(dataUrl, 0.85);
      
      // Converter para Blob
      const response = await fetch(compressed);
      const blob = await response.blob();
      
      // Validação de tamanho (5MB)
      const MAX_SIZE = 5 * 1024 * 1024;
      if (blob.size > MAX_SIZE) {
        throw new Error(
          `Foto muito grande (${(blob.size / 1024 / 1024).toFixed(1)}MB). Máximo 5MB.`
        );
      }

      console.log('📦 [CameraCapture] Blob gerado', {
        size: `${(blob.size / 1024).toFixed(1)}KB`,
        type: blob.type,
      });

      // Obter usuário autenticado
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id ?? 'anon';
      
      // Estrutura de pastas: uid/AAAA/MM/DD/filename.jpg
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const filePath = `${uid}/${yyyy}/${mm}/${dd}/${filename}`;

      console.log('📤 [CameraCapture] Enviando para Supabase', {
        bucketName,
        filePath,
        blobSize: `${(blob.size / 1024).toFixed(1)}KB`,
      });

      // Upload
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('❌ [CameraCapture] Erro no upload', error);
        throw error;
      }

      console.log('✅ [CameraCapture] Upload concluído', data);

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      console.log('🔗 [CameraCapture] URL pública gerada', publicUrl);

      const newPhotos = [...photos, publicUrl];
      console.log('📸 [CameraCapture] Atualizando estado', {
        antes: photos.length,
        depois: newPhotos.length,
        novaURL: publicUrl,
      });

      onPhotosChange(newPhotos);
      toast.success('Foto capturada e enviada!');
    } catch (error: any) {
      console.error('❌ [CameraCapture] Erro completo', {
        message: error?.message,
        stack: error?.stack,
        error,
      });
      toast.error(`Erro ao enviar foto: ${error?.message ?? 'Falha inesperada'}`);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    console.log('🗑️ [CameraCapture] Removendo foto', {
      index,
      antes: photos.length,
      depois: newPhotos.length,
    });
    onPhotosChange(newPhotos);
    toast.info('Foto removida');
  };

  return (
    <div className="space-y-4">
      {/* Input file oculto para web */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInput}
        className="hidden"
      />
      
      {/* Badge de progresso */}
      <div className="text-sm text-muted-foreground flex items-center justify-between">
        <span>
          {photos.length}/{maxPhotos} foto(s) capturada(s)
        </span>
        {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>
      
      <Button
        type="button"
        variant="outline"
        onClick={takePicture}
        disabled={uploading || photos.length >= maxPhotos}
        className="w-full h-14 text-lg"
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <CameraIcon className="mr-2 h-5 w-5" />
            Tirar Foto
          </>
        )}
      </Button>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((url, index) => (
            <div key={url} className="relative group">
              <img
                src={url}
                alt={`Foto ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removePhoto(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
