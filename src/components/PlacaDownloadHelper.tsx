import { Download, ExternalLink, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { detectarCategoria } from "@/constants/imagensPlacas";

interface PlacaDownloadHelperProps {
  codigo: string;
}

/**
 * Helper que guia o usuário para baixar imagens de placas faltantes
 */
export const PlacaDownloadHelper = ({ codigo }: PlacaDownloadHelperProps) => {
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
  
  const pastaDestino = `src/assets/placas/${categoria}/`;
  
  // GitHub não tem placas indicativas
  const temGitHub = categoria !== 'indicacao';

  return (
    <Alert className="border-primary/20 bg-primary/5">
      <Download className="h-4 w-4 text-primary" />
      <AlertDescription className="space-y-3">
        <div className="text-sm font-medium text-foreground">
          Imagem não disponível para {codigo}
        </div>
        
        <div className="text-xs text-muted-foreground space-y-2">
          <p>Para adicionar esta placa, siga os passos:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Baixe o arquivo SVG de uma das fontes abaixo</li>
            <li>Renomeie o arquivo para <code className="bg-muted px-1 py-0.5 rounded">{codigo}.svg</code></li>
            <li>Faça upload em: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{pastaDestino}</code></li>
          </ol>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          {temGitHub && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start h-auto py-2"
              onClick={() => window.open(githubUrl, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-2 flex-shrink-0" />
              <div className="flex flex-col items-start text-xs">
                <span className="font-medium">Baixar do GitHub</span>
                <span className="text-[10px] text-muted-foreground">sergio-ishii-pinhais/Brazil-PlacasDeTransito-SVG</span>
              </div>
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start h-auto py-2"
            onClick={() => window.open(wikimediaSearchUrl, '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-2 flex-shrink-0" />
            <div className="flex flex-col items-start text-xs">
              <span className="font-medium">Buscar no Wikimedia Commons</span>
              <span className="text-[10px] text-muted-foreground">Imagens de domínio público</span>
            </div>
          </Button>
          
          {categoria === 'indicacao' && (
            <div className="text-[10px] text-amber-600 dark:text-amber-500 pt-1 border-t border-border">
              ⚠️ Placas indicativas não estão disponíveis no GitHub. Use Wikimedia Commons ou crie SVGs customizados.
            </div>
          )}
        </div>

        <div className="text-[10px] text-muted-foreground pt-1 border-t border-border">
          💡 <strong>Dica:</strong> Após fazer upload do SVG, atualize a página para ver a placa
        </div>
      </AlertDescription>
    </Alert>
  );
};
