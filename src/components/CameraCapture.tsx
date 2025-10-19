import { useState, useRef } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Camera as CameraIcon, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CameraCaptureProps {
  onPhotosChange: (urls: string[]) => void;
  maxPhotos?: number;
  bucketName?: string;
}

export function CameraCapture({ 
  onPhotosChange, 
  maxPhotos = 5,
  bucketName = 'intervencoes-fotos'
}: CameraCaptureProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isNative = Capacitor.isNativePlatform();

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
    try {
      setUploading(true);
      
      // Converter DataUrl para Blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Gerar nome único para o arquivo
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `${fileName}`;

      // Upload
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      const newPhotos = [...photos, publicUrl];
      setPhotos(newPhotos);
      onPhotosChange(newPhotos);
      
      toast.success('Foto capturada e enviada!');
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da foto');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
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
            Tirar Foto ({photos.length}/{maxPhotos})
          </>
        )}
      </Button>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((url, index) => (
            <div key={index} className="relative group">
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
