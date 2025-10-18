import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { detectarCategoria } from "@/constants/imagensPlacas";
import { PlacaUploadHelper } from "./PlacaUploadHelper";

interface PlacaDownloadHelperProps {
  codigo: string;
  onUploadSuccess?: () => void;
}

/**
 * Helper que permite upload direto de placas SVG + links para download
 */
export const PlacaDownloadHelper = ({ codigo, onUploadSuccess }: PlacaDownloadHelperProps) => {
  const categoria = detectarCategoria(codigo);
  
  if (!categoria) {
    return (
      <Alert className="border-muted">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Código de placa não reconhecido: {codigo}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 items-start">
      {/* Preview da Placa - Coluna Esquerda */}
      <div className="flex flex-col items-center justify-center border-2 border-border rounded-lg p-4 bg-muted/5 min-h-[140px]">
        <div className="w-20 h-20 border border-border rounded-lg p-2 flex items-center justify-center bg-background">
          <Info className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-xs font-medium text-muted-foreground mt-2 text-center">{codigo}</p>
      </div>

      {/* Upload - Coluna Direita */}
      <div className="flex-1">
        <PlacaUploadHelper 
          codigo={codigo} 
          categoria={categoria}
          onUploadSuccess={onUploadSuccess}
          compact={true}
        />
      </div>
    </div>
  );
};
