import { useState, useRef } from "react";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PlacaUploadHelperProps {
  codigo: string;
  categoria: string;
  onUploadSuccess?: (url: string) => void;
}

export const PlacaUploadHelper = ({ 
  codigo, 
  categoria,
  onUploadSuccess 
}: PlacaUploadHelperProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    setSuccess(false);

    // Validar extensão
    if (!selectedFile.name.toLowerCase().endsWith('.svg')) {
      setError('Apenas arquivos SVG são permitidos');
      return;
    }

    // Validar tamanho (1MB)
    if (selectedFile.size > 1024 * 1024) {
      setError('Arquivo muito grande. Máximo: 1MB');
      return;
    }

    setFile(selectedFile);

    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Você precisa estar autenticado para fazer upload');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('codigo', codigo);

      const { data, error } = await supabase.functions.invoke('upload-placa-svg', {
        body: formData,
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao fazer upload');
      }

      setSuccess(true);
      toast({
        title: "Upload concluído!",
        description: `Placa ${codigo} salva com sucesso`,
      });

      if (onUploadSuccess) {
        onUploadSuccess(data.url);
      }

      // Limpar após 2 segundos
      setTimeout(() => {
        setFile(null);
        setPreview(null);
        setSuccess(false);
      }, 2000);

    } catch (err: any) {
      console.error('Erro no upload:', err);
      setError(err.message || 'Erro ao fazer upload');
      toast({
        title: "Erro no upload",
        description: err.message || 'Não foi possível fazer upload do arquivo',
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Alert className="border-primary/30 bg-primary/5">
        <Upload className="h-4 w-4 text-primary" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="text-base font-medium text-foreground">
              Faça upload da placa {codigo}
            </p>
            <p className="text-sm text-muted-foreground">
              Nome esperado: <code className="bg-muted px-1 py-0.5 rounded">{codigo}.svg</code>
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Área de Drop */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-border rounded-lg p-8 min-h-[200px] flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,image/svg+xml"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile) handleFileSelect(selectedFile);
          }}
          className="hidden"
        />

        {!preview ? (
          <div className="space-y-3">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-base font-medium text-foreground">
              Arraste o arquivo SVG aqui ou clique para selecionar
            </p>
            <p className="text-sm text-muted-foreground">
              Apenas arquivos .svg até 1MB
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-background border border-border rounded-lg p-4 inline-block">
              <img 
                src={preview} 
                alt="Preview" 
                className="w-32 h-32 object-contain"
              />
            </div>
            <p className="text-base font-medium text-foreground">
              {file?.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {(file?.size ?? 0 / 1024).toFixed(1)} KB
            </p>
          </div>
        )}
      </div>

      {/* Mensagens de erro/sucesso */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-xs text-green-700 dark:text-green-400">
            Upload concluído com sucesso!
          </AlertDescription>
        </Alert>
      )}

      {/* Botão de upload */}
      {file && !success && (
        <Button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full"
          size="sm"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Salvar Placa
            </>
          )}
        </Button>
      )}
    </div>
  );
};
