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
import * as XLSX from "xlsx";

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // 1. Processar Excel localmente
      setProgress("Processando planilha Excel...");
      const arrayBuffer = await excelFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error("Nenhum registro encontrado na planilha");
      }

      toast.success(`${jsonData.length} registros encontrados na planilha`);

      // 2. Upload das fotos e criar mapeamento
      const photoUrls: Record<string, string> = {};
      const photoArray = photos ? Array.from(photos) : [];

      if (hasPhotos && photoArray.length > 0) {
        setProgress(`Fazendo upload de ${photoArray.length} fotos...`);

        const bucketMap: Record<string, string> = {
          "placas": "placa-photos",
          "marcas_longitudinais": "marcas-longitudinais",
          "cilindros": "cilindros",
          "inscricoes": "inscricoes",
          "tachas": "tachas",
          "porticos": "porticos",
          "defensas": "defensas",
        };

        const bucketName = bucketMap[inventoryType] || "verificacao-photos";

        for (let i = 0; i < photoArray.length; i++) {
          const photo = photoArray[i];
          const timestamp = Date.now();
          const photoPath = `${inventoryType}/${timestamp}_${photo.name}`;

          const { error: photoError } = await supabase.storage
            .from(bucketName)
            .upload(photoPath, photo);

          if (!photoError) {
            const { data: urlData } = supabase.storage
              .from(bucketName)
              .getPublicUrl(photoPath);

            // Mapear todas as variações do nome
            const nomeCompleto = photo.name;
            const nomeSemExtensao = nomeCompleto.replace(/\.[^/.]+$/, "").trim();

            const variacoes = [
              nomeSemExtensao,
              nomeSemExtensao.toLowerCase(),
              nomeSemExtensao.toUpperCase(),
              nomeCompleto,
              nomeCompleto.toLowerCase(),
              nomeCompleto.toUpperCase(),
            ];

            variacoes.forEach(variacao => {
              photoUrls[variacao] = urlData.publicUrl;
            });
          }

          if ((i + 1) % 50 === 0 || i === photoArray.length - 1) {
            setProgress(`Upload: ${i + 1}/${photoArray.length} fotos`);
          }
        }

        toast.success(`${photoArray.length} fotos carregadas`);
      }

      // 3. Preparar registros para inserção
      setProgress("Preparando dados para importação...");

      const tableName = INVENTORY_TYPES.find(t => t.value === inventoryType)?.table;
      if (!tableName) throw new Error("Tipo de inventário inválido");

      const recordsToInsert = jsonData.map((row: any) => {
        const record: Record<string, any> = {
          user_id: user.id,
          lote_id: selectedLote,
          rodovia_id: selectedRodovia,
        };

        // Mapear campos do Excel
        for (const [key, value] of Object.entries(row)) {
          // Ignorar colunas vazias, "__empty" ou valores nulos
          if (!key || key.trim() === "" || key.includes("__empty") || key.includes("__EMPTY") || value === null || value === undefined) continue;

          const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, "_").replace(/[()]/g, "");

          // Para defensas, não adicionar campos automaticamente (serão mapeados explicitamente depois)
          if (inventoryType !== "defensas") {
            record[normalizedKey] = value;
          }

          // Se é o campo de foto
          if (hasPhotos && photoColumnName && key === photoColumnName) {
            const photoFileName = value as string;
            if (photoFileName && photoUrls[photoFileName]) {
              record.foto_url = photoUrls[photoFileName];
              
              // Para defensas, extrair data da foto do nome do arquivo
              if (inventoryType === "defensas" && photoFileName) {
                // Tentar extrair data do nome do arquivo (formato: YYYYMMDD ou DD-MM-YYYY)
                const dateMatch = photoFileName.match(/(\d{8})|(\d{2}[-_]\d{2}[-_]\d{4})/);
                if (dateMatch) {
                  let dateStr = dateMatch[0];
                  if (dateStr.length === 8) {
                    // Formato YYYYMMDD
                    const year = dateStr.substring(0, 4);
                    const month = dateStr.substring(4, 6);
                    const day = dateStr.substring(6, 8);
                    record.data_inspecao = `${year}-${month}-${day}`;
                  } else {
                    // Formato DD-MM-YYYY ou DD_MM_YYYY
                    const parts = dateStr.split(/[-_]/);
                    if (parts.length === 3) {
                      record.data_inspecao = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                  }
                }
              }
            }
          }
        }

        // Adicionar valores padrão para defensas
        if (inventoryType === "defensas") {
          // Mapear campos específicos do Excel para o banco
          const excelRow = row as any;
          
          // Campos básicos
          record.br = excelRow.BR || excelRow.br || null;
          record.snv = excelRow.SNV || excelRow.snv || null;
          record.tramo = String(excelRow.Tramo || excelRow.tramo || "");
          record.lado = String(excelRow.Lado || excelRow.lado || "");
          
          // Tipo de defensa (derivado - não está na planilha, usar valor padrão)
          record.tipo_defensa = "Simples";
          
          // Estado de conservação (derivado - não está na planilha, usar valor padrão)
          record.estado_conservacao = "Bom";
          
          // KMs e coordenadas (nota: planilha tem "Latitude Incial" com erro de digitação)
          record.km_inicial = Number(excelRow["Km Inicial"] || excelRow.km_inicial || 0);
          record.km_final = Number(excelRow["Km Final"] || excelRow.km_final || 0);
          record.latitude_inicial = excelRow["Latitude Incial"] || excelRow["Latitude Inicial"] || excelRow.latitude_inicial || null;
          record.longitude_inicial = excelRow["Longitude Inicial"] || excelRow.longitude_inicial || null;
          record.latitude_final = excelRow["Latitude Final"] || excelRow.latitude_final || null;
          record.longitude_final = excelRow["Longitude Final"] || excelRow.longitude_final || null;
          
          // Quantidade de lâminas e extensão
          record.quantidade_laminas = excelRow["Quantidade Lâminas"] || excelRow.quantidade_laminas || null;
          record.comprimento_total_tramo_m = excelRow["Comprimento Total do Tramo (m)"] || excelRow.comprimento_total_tramo_m || null;
          record.extensao_metros = excelRow["Comprimento Total do Tramo (m)"] || excelRow.extensao_metros || 0;
          
          // Função e especificações
          record.funcao = excelRow["Função"] || excelRow.funcao || null;
          record.especificacao_obstaculo_fixo = excelRow["Especificação do Obstáculo Fixo"] || excelRow.especificacao_obstaculo_fixo || null;
          record.id_defensa = excelRow.ID || excelRow.id || excelRow.id_defensa || null;
          
          // Distâncias e risco
          record.distancia_pista_obstaculo_m = excelRow["Distância da pista ao obstáculo (m)"] || excelRow.distancia_pista_obstaculo_m || null;
          record.risco = excelRow.Risco || excelRow.risco || null;
          record.velocidade_kmh = excelRow["Velocidade (km/h)"] || excelRow.velocidade_kmh || null;
          record.vmd_veic_dia = excelRow["VMD (veíc./dia)"] || excelRow.vmd_veic_dia || null;
          record.percentual_veiculos_pesados = excelRow["% Veículos Pesados"] || excelRow.percentual_veiculos_pesados || null;
          
          // Classificações e níveis
          record.geometria = excelRow.Geometria || excelRow.geometria || null;
          record.classificacao_nivel_contencao = excelRow["Classificação do nível de Contenção"] || excelRow.classificacao_nivel_contencao || null;
          record.nivel_contencao_en1317 = excelRow["Nível de contenção EN 1317-2"] || excelRow.nivel_contencao_en1317 || null;
          record.nivel_contencao_nchrp350 = excelRow["Nível de contenção NCHRP 350"] || excelRow.nivel_contencao_nchrp350 || null;
          record.nivel_risco = excelRow["Classificação do nível de Contenção"] || excelRow.nivel_risco || null;
          
          // Espaço de trabalho e terminais
          record.espaco_trabalho = excelRow["Espaço de Trabalho"] || excelRow.espaco_trabalho || null;
          record.terminal_entrada = excelRow["Terminal de Entrada"] || excelRow.terminal_entrada || null;
          record.terminal_saida = excelRow["Terminal de Saída"] || excelRow.terminal_saida || null;
          
          // Adequações
          record.adequacao_funcionalidade_lamina = excelRow["Adequação à funcionalidade - Lâmina"] || excelRow.adequacao_funcionalidade_lamina || null;
          record.adequacao_funcionalidade_laminas_inadequadas = excelRow["Adequação à funcionalidade - Lâminas inadequadas"] || excelRow.adequacao_funcionalidade_laminas_inadequadas || null;
          record.adequacao_funcionalidade_terminais = excelRow["Adequação à funcionalidade - Terminais"] || excelRow.adequacao_funcionalidade_terminais || null;
          record.adequacao_funcionalidade_terminais_inadequados = excelRow["Adequação à funcionalidade - Terminais inadequados"] || excelRow.adequacao_funcionalidade_terminais_inadequados || null;
          
          // Distâncias específicas
          record.distancia_face_defensa_obstaculo_m = excelRow["Distância da face da defensa ao obstáculo(m)"] || excelRow.distancia_face_defensa_obstaculo_m || null;
          record.distancia_bordo_pista_face_defensa_m = excelRow["Distância da linha de bordo da pista à face da defensa (m)"] || excelRow.distancia_bordo_pista_face_defensa_m || null;
          
          // Link da fotografia
          record.link_fotografia = excelRow["Link da Fotografia"] || excelRow.link_fotografia || null;
          
          // Campos obrigatórios com defaults (data_inspecao já pode ter sido definida pela foto)
          if (!record.data_inspecao) {
            record.data_inspecao = record.data || new Date().toISOString().split('T')[0];
          }
          record.extensao_metros = Number(record.comprimento_total_tramo_m || record.extensao_metros || record.extensao_m || 0);
          record.necessita_intervencao = Boolean(record.necessita_intervencao || false);
        }

        return record;
      });

      // 4. Inserir em lotes
      setProgress("Inserindo dados no banco...");
      const batchSize = 50;
      let imported = 0;

      for (let i = 0; i < recordsToInsert.length; i += batchSize) {
        const batch = recordsToInsert.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from(tableName as any)
          .insert(batch as any);

        if (insertError) {
          console.error("Erro ao inserir batch:", insertError);
          throw insertError;
        }

        imported += batch.length;
        setProgress(`Importando: ${imported}/${recordsToInsert.length} registros`);
      }

      setProgress("");
      toast.success(`Importação concluída! ${imported} registros importados${hasPhotos ? ` com ${photoArray.length} fotos` : ''}.`);

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
            se houver fotos, marque a opção correspondente, informe a letra da coluna do Excel que contém os nomes das fotos (ex: A, B, AA, AB, AC) e selecione as fotos.
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
                  Informe a letra da coluna no Excel que contém os nomes dos arquivos de foto (ex: A, B, C, ... Z, AA, AB, AC, AD, ...)
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