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
    <div className="space-y-3">
      <PlacaUploadHelper 
        codigo={codigo} 
        categoria={categoria}
        onUploadSuccess={onUploadSuccess}
      />
    </div>
  );
};
