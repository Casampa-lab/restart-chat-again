import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, FolderOpen, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { parseExcelFile, PlacaData } from "@/lib/excelImport";

export function InventarioPlacasManager() {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [photosFolder, setPhotosFolder] = useState<FileList | null>(null);
  const [selectedLote, setSelectedLote] = useState<string>("");
  const [selectedRodovia, setSelectedRodovia] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<string>("");

  // Buscar lotes
  const { data: lotes } = useQuery({
    queryKey: ["lotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lotes")
        .select("id, numero")
        .order("numero");
      if (error) throw error;
      return data;
    },
  });

  // Buscar rodovias
  const { data: rodovias } = useQuery({
    queryKey: ["rodovias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rodovias")
        .select("id, codigo, nome")
        .order("codigo");
      if (error) throw error;
      return data;
    },
  });

  const handleExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xlsm') || file.name.endsWith('.xls')) {
        setExcelFile(file);
      } else {
        toast.error("Por favor, selecione um arquivo Excel válido (.xlsx, .xlsm, .xls)");
      }
    }
  };

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPhotosFolder(e.target.files);
      toast.success(`${e.target.files.length} fotos selecionadas`);
    }
  };

  const handleImport = async () => {
    if (!excelFile) {
      toast.error("Selecione o arquivo Excel");
      return;
    }

    if (!selectedLote || !selectedRodovia) {
      toast.error("Selecione o lote e a rodovia");
      return;
    }

    setImporting(true);
    setProgress("Iniciando importação...");

    try {
      // 1. Processar Excel
      setProgress("Processando planilha Excel...");
      const placasData = await parseExcelFile(excelFile);
      
      if (placasData.length === 0) {
        throw new Error("Nenhuma placa encontrada na planilha");
      }

      toast.success(`${placasData.length} placas encontradas na planilha`);

      // 2. Upload das fotos e criar mapeamento por nome e data
      const photoUrls: Record<string, string> = {};
      const photoDates: Record<string, string> = {};
      
      if (photosFolder && photosFolder.length > 0) {
        setProgress(`Fazendo upload de ${photosFolder.length} fotos...`);
        
        for (let i = 0; i < photosFolder.length; i++) {
          const photo = photosFolder[i];
          const photoPath = `inventario/${selectedLote}/${Date.now()}_${photo.name}`;
          
          // Extrair data da foto (lastModified do arquivo)
          const photoDate = new Date(photo.lastModified).toISOString().split("T")[0];
          
          const { error: photoError } = await supabase.storage
            .from("placa-photos")
            .upload(photoPath, photo);

          if (!photoError) {
            const { data: urlData } = supabase.storage
              .from("placa-photos")
              .getPublicUrl(photoPath);
            
            // Normalizar nome: remover extensão e criar variações
            const nomeSemExt = photo.name.replace(/\.[^/.]+$/, ""); // Remove qualquer extensão
            const nomeNormalizado = nomeSemExt.trim();
            
            // Criar múltiplas chaves para aumentar chance de match
            const chavesParaMapear = [
              nomeNormalizado,
              nomeNormalizado.toLowerCase(),
              nomeNormalizado.toUpperCase(),
              nomeSemExt,
              nomeSemExt.toLowerCase(),
              nomeSemExt.toUpperCase(),
              photo.name, // Nome completo com extensão
              photo.name.toLowerCase(),
              photo.name.toUpperCase(),
            ];
            
            chavesParaMapear.forEach(chave => {
              photoUrls[chave] = urlData.publicUrl;
              photoDates[chave] = photoDate;
            });
            
            console.log(`✅ Foto mapeada: "${nomeNormalizado}" -> Data: ${photoDate}`);
          } else {
            console.error(`❌ Erro ao fazer upload da foto ${photo.name}:`, photoError);
          }

          if ((i + 1) % 10 === 0) {
            setProgress(`Upload de fotos: ${i + 1}/${photosFolder.length}`);
          }
        }
        
        console.log('📸 Total de fotos únicas:', photosFolder.length);
        console.log('📸 Total de chaves mapeadas:', Object.keys(photoUrls).length);
        console.log('📸 Primeiras 10 chaves:', Object.keys(photoUrls).slice(0, 10));
        toast.success(`${photosFolder.length} fotos carregadas`);
      }

      // 3. Inserir dados no banco
      setProgress("Importando placas para o banco de dados...");
      
      const { data: userData } = await supabase.auth.getUser();
      
      // Log para debug
      console.log('🔍 Primeiras 5 placas com hiperlink:', placasData.slice(0, 5).map(p => ({
        snv: p.snv,
        foto_hiperlink: p.foto_hiperlink
      })));
      
      let fotosLinkadas = 0;
      let fotosNaoLinkadas = 0;
      
      const placasParaInserir = placasData.map((placa: PlacaData) => {
        // Tentar múltiplas variações do nome da foto
        let fotoUrl = null;
        let dataVistoria = new Date().toISOString().split("T")[0]; // Data padrão se não encontrar foto
        
        if (placa.foto_hiperlink) {
          // Normalizar o nome do hiperlink
          const hiperlink = placa.foto_hiperlink.trim();
          
          // Tentar todas as variações possíveis
          const tentativas = [
            hiperlink,
            hiperlink.toLowerCase(),
            hiperlink.toUpperCase(),
            hiperlink + '.jpg',
            hiperlink + '.JPG',
            hiperlink + '.jpeg',
            hiperlink + '.JPEG',
            hiperlink + '.png',
            hiperlink + '.PNG',
            hiperlink.toLowerCase() + '.jpg',
            hiperlink.toLowerCase() + '.png',
            hiperlink.toUpperCase() + '.JPG',
            hiperlink.toUpperCase() + '.PNG',
          ];
          
          for (const tentativa of tentativas) {
            if (photoUrls[tentativa]) {
              fotoUrl = photoUrls[tentativa];
              dataVistoria = photoDates[tentativa] || dataVistoria; // Usar data da foto
              fotosLinkadas++;
              console.log(`✅ Match encontrado! "${hiperlink}" -> "${tentativa}" (SNV: ${placa.snv})`);
              break;
            }
          }
          
          if (!fotoUrl) {
            fotosNaoLinkadas++;
            console.warn(`❌ Foto não encontrada para: "${hiperlink}" (SNV: ${placa.snv})`);
            console.warn('   Tentativas:', tentativas.slice(0, 5));
          }
        }
        
        return {
          user_id: userData.user?.id,
          lote_id: selectedLote,
          rodovia_id: selectedRodovia,
          br: placa.br,
          snv: placa.snv,
          tipo: placa.tipo,
          codigo: placa.codigo,
          velocidade: placa.velocidade,
          lado: placa.lado,
          km: placa.km,
          latitude: placa.latitude,
          longitude: placa.longitude,
          suporte: placa.tipo_suporte,
          qtde_suporte: placa.qtde_suporte,
          substrato: placa.substrato,
          pelicula: placa.pelicula,
          retrorrefletividade: placa.retrorrefletividade,
          dimensoes_mm: placa.dimensoes_mm,
          area_m2: placa.area_m2,
          altura_m: placa.altura,
          data_vistoria: dataVistoria,
          foto_frontal_url: fotoUrl,
        };
      });
      
      console.log(`📊 Fotos linkadas: ${fotosLinkadas} | Não linkadas: ${fotosNaoLinkadas}`);

      // Inserir em lotes de 50
      const batchSize = 50;
      let imported = 0;

      for (let i = 0; i < placasParaInserir.length; i += batchSize) {
        const batch = placasParaInserir.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from("ficha_placa")
          .insert(batch);

        if (insertError) {
          console.error("Erro ao inserir batch:", insertError);
          throw insertError;
        }

        imported += batch.length;
        setProgress(`Importando: ${imported}/${placasParaInserir.length} placas`);
      }

      setProgress("");
      toast.success(`Importação concluída! ${imported} placas importadas (${fotosLinkadas} com fotos).`);
      
      // Limpar formulário
      setExcelFile(null);
      setPhotosFolder(null);
      setSelectedLote("");
      setSelectedRodovia("");
      
      // Resetar inputs
      const excelInput = document.getElementById('excel-file') as HTMLInputElement;
      const photosInput = document.getElementById('photos-folder') as HTMLInputElement;
      if (excelInput) excelInput.value = '';
      if (photosInput) photosInput.value = '';

    } catch (error: any) {
      console.error("Erro na importação:", error);
      toast.error("Erro ao importar inventário: " + error.message);
      setProgress("");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Importar Inventário de Placas
        </CardTitle>
        <CardDescription>
          Faça upload do arquivo Excel com o cadastro de placas e a pasta com as fotos correspondentes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seleção de Lote e Rodovia */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lote">Lote *</Label>
            <Select value={selectedLote} onValueChange={setSelectedLote}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o lote" />
              </SelectTrigger>
              <SelectContent>
                {lotes?.map((lote) => (
                  <SelectItem key={lote.id} value={lote.id}>
                    Lote {lote.numero}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rodovia">Rodovia *</Label>
            <Select value={selectedRodovia} onValueChange={setSelectedRodovia}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a rodovia" />
              </SelectTrigger>
              <SelectContent>
                {rodovias?.map((rodovia) => (
                  <SelectItem key={rodovia.id} value={rodovia.id}>
                    {rodovia.codigo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Upload do Excel */}
        <div className="space-y-2">
          <Label htmlFor="excel-file" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Arquivo Excel (.xlsx, .xlsm, .xls) *
          </Label>
          <Input
            id="excel-file"
            type="file"
            accept=".xlsx,.xlsm,.xls"
            onChange={handleExcelChange}
            disabled={importing}
          />
          {excelFile && (
            <p className="text-sm text-muted-foreground">
              Arquivo selecionado: {excelFile.name}
            </p>
          )}
        </div>

        {/* Upload das Fotos */}
        <div className="space-y-2">
          <Label htmlFor="photos-folder" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Pasta de Fotos (opcional)
          </Label>
          <Input
            id="photos-folder"
            type="file"
            multiple
            accept="image/*"
            onChange={handlePhotosChange}
            disabled={importing}
          />
          {photosFolder && (
            <p className="text-sm text-muted-foreground">
              {photosFolder.length} fotos selecionadas
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            As fotos serão associadas automaticamente pelo hiperlink da coluna AA do Excel
          </p>
        </div>

        {/* Progress */}
        {progress && (
          <div className="bg-primary/10 p-4 rounded-lg">
            <p className="text-sm font-medium text-primary flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {progress}
            </p>
          </div>
        )}

        {/* Botão de Importação */}
        <Button
          onClick={handleImport}
          disabled={!excelFile || !selectedLote || !selectedRodovia || importing}
          className="w-full"
          size="lg"
        >
          {importing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Importar Inventário
            </>
          )}
        </Button>

        <div className="bg-muted p-4 rounded-lg space-y-2">
          <h4 className="font-semibold text-sm">Instruções:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>O arquivo Excel deve conter as colunas conforme modelo padrão DNIT</li>
            <li>A coluna AA deve conter hiperlinks para as fotos das placas</li>
            <li>Os nomes dos arquivos das fotos devem corresponder aos hiperlinks do Excel</li>
            <li>Formatos suportados: JPG, PNG, WEBP</li>
            <li>A importação pode levar alguns minutos dependendo da quantidade de registros</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
