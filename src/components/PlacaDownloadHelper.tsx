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
    <div className="space-y-2">
      {/* Ícone da Placa - Compacto no Topo */}
      <div className="flex items-center justify-center gap-2 p-2 border border-border rounded-lg bg-muted/5">
        <div className="w-12 h-12 border border-border rounded-lg p-1 flex items-center justify-center bg-background">
          <Info className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{codigo}</p>
      </div>

      {/* Upload Helper - Logo Abaixo */}
      <PlacaUploadHelper 
        codigo={codigo} 
        categoria={categoria}
        onUploadSuccess={onUploadSuccess}
        compact={true}
      />
    </div>
  );
};
