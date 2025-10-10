import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, Image, Loader2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";

const INVENTORY_TYPES = [
  { value: "placas", label: "Placas de Sinalização Vertical", table: "ficha_placa" },
  { value: "marcas_longitudinais", label: "Marcas Longitudinais", table: "ficha_marcas_longitudinais" },
  { value: "cilindros", label: "Cilindros Delimitadores", table: "intervencoes_cilindros" },
  { value: "inscricoes", label: "Zebrados, Setas, Símbolos e Legendas", table: "ficha_inscricoes" },
  { value: "tachas", label: "Tachas Refletivas", table: "ficha_tachas" },
  { value: "porticos", label: "Pórticos e Braços Projetados", table: "ficha_porticos" },
  { value: "defensas", label: "Defensas", table: "defensas" },
];

export function InventarioImporterManager() {
  const [inventoryType, setInventoryType] = useState<string>("");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [selectedLote, setSelectedLote] = useState<string>("");
  const [selectedRodovia, setSelectedRodovia] = useState<string>("");
  const [photoColumnName, setPhotoColumnName] = useState<string>("");
  const [hasPhotos, setHasPhotos] = useState(false);
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
        toast.success(`Arquivo Excel selecionado: ${file.name}`);
      } else {
        toast.error("Por favor, selecione um arquivo Excel válido (.xlsx, .xlsm, .xls)");
      }
    }
  };

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPhotos(e.target.files);
      toast.success(`${e.target.files.length} fotos selecionadas`);
    }
  };

  const handleImport = async () => {
    if (!inventoryType) {
      toast.error("Selecione o tipo de inventário");
      return;
    }

    if (!excelFile) {
      toast.error("Selecione o arquivo Excel");
      return;
    }

    if (!selectedLote || !selectedRodovia) {
      toast.error("Selecione o lote e a rodovia");
      return;
    }

    if (hasPhotos && !photoColumnName) {
      toast.error("Informe o nome da coluna que contém os nomes das fotos");
      return;
    }

    if (hasPhotos && (!photos || photos.length === 0)) {
      toast.error("Selecione as fotos para importar");
      return;
    }

    setImporting(true);
    setProgress("Iniciando importação...");

    try {
      // Preparar dados para envio
      const formData = new FormData();
      formData.append("excel", excelFile);
      formData.append("inventory_type", inventoryType);
      formData.append("lote_id", selectedLote);
      formData.append("rodovia_id", selectedRodovia);
      formData.append("has_photos", hasPhotos.toString());
      
      if (hasPhotos && photoColumnName) {
        formData.append("photo_column_name", photoColumnName);
        
        // Adicionar todas as fotos
        if (photos) {
          setProgress(`Preparando upload de ${photos.length} fotos...`);
          Array.from(photos).forEach((photo, index) => {
            formData.append(`photo_${index}`, photo);
          });
          toast.success(`${photos.length} fotos preparadas para upload`);
        }
      }

      setProgress(hasPhotos && photos ? `Enviando ${photos.length} fotos e processando dados...` : "Enviando dados para processamento...");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Chamar edge function para processar importação
      const { data, error } = await supabase.functions.invoke("import-inventory", {
        body: formData,
      });

      if (error) throw error;

      setProgress("Importação concluída!");
      const fotosMsg = hasPhotos && photos ? ` com ${photos.length} fotos` : '';
      toast.success(`Importação realizada com sucesso! ${data?.imported_count || 0} registros importados${fotosMsg}.`);
      
      // Limpar formulário
      setExcelFile(null);
      setPhotos(null);
      setPhotoColumnName("");
      setHasPhotos(false);
      setProgress("");
      
    } catch (error: any) {
      console.error("Erro na importação:", error);
      toast.error("Erro ao importar inventário: " + (error.message || "Erro desconhecido"));
      setProgress("");
    } finally {
      setImporting(false);
    }
  };

  const selectedType = INVENTORY_TYPES.find(t => t.value === inventoryType);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Importação Genérica de Inventários
        </CardTitle>
        <CardDescription>
          Importe dados de inventário a partir de planilhas Excel com ou sem fotos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Este sistema permite importar qualquer tipo de inventário. Selecione o tipo, faça upload do Excel e, 
            se houver fotos, marque a opção correspondente, informe a letra da coluna (ex: AA, AB) e selecione as fotos.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inventory-type">Tipo de Inventário *</Label>
            <Select value={inventoryType} onValueChange={setInventoryType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de inventário" />
              </SelectTrigger>
              <SelectContent>
                {INVENTORY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedType && (
              <p className="text-xs text-muted-foreground">
                Tabela: {selectedType.table}
              </p>
            )}
          </div>

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
                      {lote.numero}
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

          <div className="space-y-2">
            <Label htmlFor="excel-file">Arquivo Excel *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx,.xlsm,.xls"
                onChange={handleExcelChange}
                className="cursor-pointer"
              />
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            </div>
            {excelFile && (
              <p className="text-xs text-muted-foreground">
                Arquivo selecionado: {excelFile.name}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50">
            <Checkbox 
              id="has-photos" 
              checked={hasPhotos} 
              onCheckedChange={(checked) => setHasPhotos(checked as boolean)}
            />
            <label
              htmlFor="has-photos"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Este inventário inclui fotos
            </label>
          </div>

          {hasPhotos && (
            <>
              <div className="space-y-2">
                <Label htmlFor="photo-column">Letra da Coluna das Fotos *</Label>
                <Input
                  id="photo-column"
                  placeholder="Ex: AA, AB, AC, etc..."
                  value={photoColumnName}
                  onChange={(e) => setPhotoColumnName(e.target.value.toUpperCase())}
                />
                <p className="text-xs text-muted-foreground">
                  Informe a letra da coluna no Excel que contém os nomes dos arquivos de foto (ex: AA, AB, AC)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="photos">Fotos *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="photos"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotosChange}
                    className="cursor-pointer"
                  />
                  <Image className="h-5 w-5 text-muted-foreground" />
                </div>
                {photos && (
                  <p className="text-xs text-muted-foreground">
                    {photos.length} fotos selecionadas
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Selecione todas as fotos. Você pode selecionar múltiplos arquivos de uma vez.
                </p>
              </div>
            </>
          )}

          {progress && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>{progress}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleImport} 
            disabled={importing || !inventoryType || !excelFile || !selectedLote || !selectedRodovia}
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
        </div>
      </CardContent>
    </Card>
  );
}