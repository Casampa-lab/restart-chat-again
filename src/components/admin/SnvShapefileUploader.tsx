import { useState, useEffect } from "react";
import { Upload, FileArchive, CheckCircle, XCircle, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SnvMetadata {
  versao: string;
  features_count: number;
  bounding_box: number[][];
  rodovias: string[];
  tamanho_mb: number;
  data_upload?: string;
}

export function SnvShapefileUploader() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [versao, setVersao] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SnvMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeMetadata, setActiveMetadata] = useState<SnvMetadata | null>(null);

  // Carregar metadados da camada ativa
  useEffect(() => {
    loadActiveMetadata();
  }, []);

  const loadActiveMetadata = async () => {
    const { data } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'snv_geojson_metadata')
      .single();

    if (data?.valor) {
      try {
        const metadata = JSON.parse(data.valor);
        if (metadata.versao) {
          setActiveMetadata(metadata);
        }
      } catch (e) {
        console.error('Erro ao parsear metadados SNV:', e);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.zip')) {
        setError('Apenas arquivos .zip são aceitos');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.zip')) {
      setFile(droppedFile);
      setError(null);
      setResult(null);
    } else {
      setError('Apenas arquivos .zip são aceitos');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleConvert = async () => {
    if (!file || !versao.trim()) {
      setError('Selecione um arquivo e informe a versão');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      // Simular progresso
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('versao', versao.trim());

      const response = await supabase.functions.invoke('process-snv-shapefile', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'Erro na conversão');
      }

      setResult(data.metadata);
      await loadActiveMetadata();

      toast({
        title: "✅ Conversão concluída!",
        description: `Camada SNV ${versao} processada com ${data.metadata.features_count.toLocaleString()} features`,
      });

    } catch (err) {
      console.error('Erro na conversão:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      toast({
        title: "❌ Erro na conversão",
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Camada Ativa */}
      {activeMetadata?.versao && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Camada SNV Ativa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Versão:</span>
                <p className="font-medium">{activeMetadata.versao}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Features:</span>
                <p className="font-medium">{activeMetadata.features_count?.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Rodovias:</span>
                <p className="font-medium">{activeMetadata.rodovias?.length || 0}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tamanho:</span>
                <p className="font-medium">{activeMetadata.tamanho_mb?.toFixed(2)} MB</p>
              </div>
              {activeMetadata.data_upload && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Última atualização:</span>
                  <p className="font-medium">
                    {new Date(activeMetadata.data_upload).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Atualizar Camada SNV</CardTitle>
          <CardDescription>
            Faça upload de um arquivo .zip contendo os shapefiles SNV (.shp, .dbf, .shx)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Versão */}
          <div className="space-y-2">
            <Label htmlFor="versao">Versão SNV</Label>
            <Input
              id="versao"
              placeholder="Ex: 202507A"
              value={versao}
              onChange={(e) => setVersao(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
          >
            <input
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              disabled={isProcessing}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <FileArchive className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Arraste o arquivo .zip aqui ou clique para selecionar
              </p>
              {file && (
                <p className="text-sm font-medium text-primary">
                  📦 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </label>
          </div>

          {/* Progresso */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processando shapefile... {progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Erro */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Resultado */}
          {result && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                <p className="font-medium mb-2">Conversão concluída!</p>
                <ul className="text-sm space-y-1">
                  <li>✅ {result.features_count.toLocaleString()} features processadas</li>
                  <li>🛣️ {result.rodovias.length} rodovias identificadas</li>
                  <li>💾 {result.tamanho_mb.toFixed(2)} MB de dados GeoJSON</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Botão */}
          <Button
            onClick={handleConvert}
            disabled={!file || !versao.trim() || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Convertendo...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Converter para GeoJSON
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
