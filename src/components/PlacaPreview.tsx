import { ImageOff } from "lucide-react";
import { getImagemPlaca } from "@/constants/imagensPlacas";
import { PlacaDownloadHelper } from "./PlacaDownloadHelper";
import { useState } from "react";

interface PlacaPreviewProps {
  codigo: string | null | undefined;
  size?: "small" | "large";
  showLabel?: boolean;
  showDownloadHelper?: boolean;
}

export const PlacaPreview = ({ 
  codigo, 
  size = "large",
  showLabel = false,
  showDownloadHelper = true
}: PlacaPreviewProps) => {
  const [imageError, setImageError] = useState(false);
  const imagePath = getImagemPlaca(codigo);
  const hasImage = imagePath && !imageError;
  
  const sizeClasses = {
    small: "w-5 h-5",
    large: "w-24 h-24"
  };

  // Placeholder quando não há código selecionado
  if (!codigo) {
    return (
      <div className={`${sizeClasses[size]} border-2 border-dashed border-muted rounded-lg flex flex-col items-center justify-center text-muted-foreground bg-muted/20`}>
        <ImageOff className={size === "large" ? "w-8 h-8 mb-1" : "w-3 h-3"} />
        {size === "large" && <span className="text-xs">Sem seleção</span>}
      </div>
    );
  }

  // Quando a imagem não existe ou falhou ao carregar
  if (!hasImage) {
    return (
      <div className="space-y-3">
        <div className={`${sizeClasses[size]} border border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground bg-muted/10`}>
          <ImageOff className={size === "large" ? "w-6 h-6 mb-1" : "w-3 h-3"} />
          {size === "large" && showLabel && (
            <span className="text-xs text-center px-1">{codigo}</span>
          )}
        </div>
        
        {/* Mostra o helper apenas no tamanho large e quando habilitado */}
        {size === "large" && showDownloadHelper && (
          <PlacaDownloadHelper codigo={codigo} />
        )}
      </div>
    );
  }

  // Preview da placa com imagem
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${sizeClasses[size]} border border-border rounded-lg p-1 flex items-center justify-center bg-background shadow-sm`}>
        <img 
          src={imagePath} 
          alt={`Placa ${codigo}`}
          className="w-full h-full object-contain"
          onError={() => setImageError(true)}
        />
      </div>
      {size === "large" && showLabel && (
        <span className="text-xs font-medium text-muted-foreground">{codigo}</span>
      )}
    </div>
  );
};
