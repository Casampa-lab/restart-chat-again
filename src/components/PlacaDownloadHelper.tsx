import { Download, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { detectarCategoria } from "@/constants/imagensPlacas";
import { PlacaUploadHelper } from "./PlacaUploadHelper";
import { useState } from "react";

interface PlacaDownloadHelperProps {
  codigo: string;
  onUploadSuccess?: () => void;
}

/**
 * Helper que permite upload direto de placas SVG + links para download
 */
export const PlacaDownloadHelper = ({ codigo, onUploadSuccess }: PlacaDownloadHelperProps) => {
  const [showSources, setShowSources] = useState(false);
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

  const githubUrl = `https://github.com/sergio-ishii-pinhais/Brazil-PlacasDeTransito-SVG/blob/main/${categoria}/${codigo}.svg`;
  const wikimediaSearchUrl = `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(`Brasil ${codigo}`)}&title=Special:MediaSearch&type=image`;
  
  // GitHub não tem placas indicativas
  const temGitHub = categoria !== 'indicacao';

  return (
    <div className="space-y-3">
      {/* Upload direto - Destaque principal */}
      <PlacaUploadHelper 
        codigo={codigo} 
        categoria={categoria}
        onUploadSuccess={onUploadSuccess}
      />

      {/* Fontes para download - Colapsável */}
      <Alert className="border-muted">
        <Download className="h-4 w-4 text-muted-foreground" />
        <AlertDescription>
          <button
            onClick={() => setShowSources(!showSources)}
            className="w-full flex items-center justify-between text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            <span>Onde encontrar placas SVG?</span>
            {showSources ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showSources && (
            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Fontes recomendadas:</p>
              
              {temGitHub && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="font-medium text-foreground">📦 GitHub (Regulamentação/Advertência)</p>
                  <p className="text-[10px]">sergio-ishii-pinhais/Brazil-PlacasDeTransito-SVG</p>
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-[10px] inline-block mt-1"
                  >
                    Abrir no GitHub →
                  </a>
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="font-medium text-foreground">🌐 Wikimedia Commons (Todas)</p>
                <p className="text-[10px]">Imagens de domínio público</p>
                <a
                  href={wikimediaSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-[10px] inline-block mt-1"
                >
                  Buscar no Wikimedia →
                </a>
              </div>

              {categoria === 'indicacao' && (
                <div className="text-[10px] text-amber-600 dark:text-amber-500 pt-2 border-t border-border">
                  ⚠️ Placas indicativas não estão disponíveis no GitHub
                </div>
              )}

              <div className="text-[10px] pt-2 border-t border-border">
                💡 <strong>Dica:</strong> Baixe de qualquer fonte e faça upload usando o campo acima
              </div>
            </div>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
};
