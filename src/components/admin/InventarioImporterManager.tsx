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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as XLSX from "xlsx";
import { useInventoryStatus, getStatusIndicator } from "@/hooks/useInventoryStatus";

const INVENTORY_TYPES = [
  { value: "cilindros", label: "Cilindros Delimitadores", table: "ficha_cilindros" },
  { value: "defensas", label: "Defensas", table: "defensas" },
  { value: "marcas_longitudinais", label: "Marcas Longitudinais", table: "ficha_marcas_longitudinais" },
  { value: "placas", label: "Placas de Sinalização Vertical", table: "ficha_placa" },
  { value: "porticos", label: "Pórticos e Braços Projetados", table: "ficha_porticos" },
  { value: "tachas", label: "Tachas Refletivas", table: "ficha_tachas" },
  { value: "inscricoes", label: "Zebrados, Setas, Símbolos e Legendas", table: "ficha_inscricoes" },
];

// Constantes de otimização para batching
const LOG_UPDATE_INTERVAL = 100; // Atualizar UI a cada 100 registros
const BATCH_SIZE = 100; // Inserir 100 registros por vez no banco

interface InventarioImporterManagerProps {
  loteId?: string;
  rodoviaId?: string;
}

export function InventarioImporterManager({ loteId: propLoteId, rodoviaId: propRodoviaId }: InventarioImporterManagerProps = {}) {
  const queryClient = useQueryClient();
  const [inventoryType, setInventoryType] = useState<string>("");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [photoColumnName, setPhotoColumnName] = useState<string>("");
  const [hasPhotos, setHasPhotos] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<string>("");
  
  // Rastreamento de fotos para limpeza automática
  const [fotosUploadadas, setFotosUploadadas] = useState<string[]>([]);
  const [fotosVinculadas, setFotosVinculadas] = useState<Set<string>>(new Set());

  // Hook para status de importação
  const { inventoryCounts } = useInventoryStatus(propLoteId, propRodoviaId);
  const inventoryStatus = inventoryCounts.data;

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
    // Prevenir múltiplas execuções simultâneas
    if (importing) {
      console.log("Importação já em andamento, ignorando clique duplicado");
      return;
    }
    
    if (!inventoryType) {
      toast.error("Selecione o tipo de cadastro");
      return;
    }

    if (!excelFile) {
      toast.error("Selecione o arquivo Excel");
      return;
    }

    if (!propLoteId || !propRodoviaId) {
      toast.error("Selecione o lote e a rodovia no topo da página");
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
    
    // Reset rastreamento de fotos
    setFotosUploadadas([]);
    setFotosVinculadas(new Set());

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // 1. Processar Excel localmente
      setProgress("Processando planilha Excel...");
      
      // Verificar se o arquivo ainda é acessível
      if (!excelFile || !excelFile.size) {
        throw new Error("Arquivo Excel não está mais acessível. Por favor, selecione o arquivo novamente.");
      }
      
      // Ler o arrayBuffer do arquivo com tratamento de erro específico
      let arrayBuffer: ArrayBuffer;
      try {
        arrayBuffer = await excelFile.arrayBuffer();
      } catch (fileError: any) {
        console.error("Erro ao ler arquivo:", fileError);
        throw new Error(`Erro ao ler o arquivo Excel: ${fileError.message || 'Arquivo não acessível'}. Tente selecionar o arquivo novamente.`);
      }
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Ler JSON completo como ARRAY (header: 1) para acessar por índice de coluna
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // Retorna arrays ao invés de objetos
        raw: false,
        defval: null,
      }) as any[][];

      if (jsonData.length === 0) {
        throw new Error("Nenhum registro encontrado na planilha");
      }

      // Detecção automática da estrutura da planilha
      // Verifica se a primeira linha contém headers típicos ou é uma linha de título
      const detectSheetStructure = (): { headerRow: number; dataStartRow: number } => {
        const firstRow = jsonData[0] as any[];
        
        // Headers típicos por tipo de inventário (case insensitive)
        const typicalHeaders: Record<string, string[]> = {
          "placas": ["br", "snv", "km", "código", "lado", "tipo", "latitude", "longitude"],
          "marcas_longitudinais": ["br", "snv", "km", "tipo", "demarcação", "cor", "largura", "extensão"],
          "cilindros": ["br", "snv", "km", "cor", "quantidade", "tipo"],
          "inscricoes": ["br", "snv", "km", "sigla", "tipo", "cor", "dimensões"],
          "tachas": ["br", "snv", "km", "tipo", "cor", "quantidade"],
          "porticos": ["br", "snv", "km", "tipo", "vão", "altura"],
          "defensas": ["br", "snv", "km", "tipo", "extensão", "lado"],
        };
        
        const expectedHeaders = typicalHeaders[inventoryType] || ["br", "snv", "km"];
        
        // Verificar se alguma célula é muito longa (indica título, não header)
        const hasLongCell = firstRow.some(cell => String(cell || '').trim().length > 50);
        if (hasLongCell) {
          console.log(`📋 Linha de título detectada (célula longa encontrada). Headers na linha 2`);
          return { headerRow: 1, dataStartRow: 2 };
        }
        
        // Verificar se a primeira linha contém headers típicos com matching mais preciso
        const firstRowHeaders = firstRow.map(cell => 
          String(cell || '').trim().toLowerCase()
        );
        
        console.log(`🔍 Analisando primeira linha:`, firstRowHeaders.slice(0, 5));
        
        const matchedHeaders: string[] = [];
        expectedHeaders.forEach(header => {
          const found = firstRowHeaders.some(cell => {
            // Matching mais preciso: célula deve ser similar ao header
            const similarity = cell === header || 
                              (cell.includes(header) && cell.length < header.length + 10);
            return similarity;
          });
          if (found) matchedHeaders.push(header);
        });
        
        console.log(`🎯 Headers encontrados:`, matchedHeaders);
        
        // Se encontrou pelo menos 3 headers típicos, assume que é linha de header
        if (matchedHeaders.length >= 3) {
          console.log(`✅ Headers detectados na linha 1 (${matchedHeaders.length} campos identificados)`);
          return { headerRow: 0, dataStartRow: 1 };
        }
        
        // Caso contrário, assume estrutura tradicional com linha de título
        console.log(`📋 Linha de título detectada. Headers na linha 2`);
        return { headerRow: 1, dataStartRow: 2 };
      };
      
      const config = detectSheetStructure();
      const headers = jsonData[config.headerRow] as any[];
      let dataRows = jsonData.slice(config.dataStartRow);

      // Filtrar linhas vazias - verificar campos obrigatórios específicos por tipo
      dataRows = dataRows.filter((row: any) => {
        // Se a linha não existe ou é vazia, retornar false
        if (!row || !Array.isArray(row)) return false;
        
        // Função auxiliar para buscar valor em coluna (case insensitive)
        const getColumnValue = (columnNames: string[]): any => {
          for (let i = 0; i < headers.length; i++) {
            const header = String(headers[i] || '').trim().toLowerCase();
            if (columnNames.some(name => header === name.toLowerCase())) {
              const value = row[i];
              if (value !== null && value !== undefined && String(value).trim() !== '') {
                return value;
              }
            }
          }
          return null;
        };
        
        // Verificar campos obrigatórios específicos por tipo de inventário
        if (inventoryType === "placas") {
          const km = getColumnValue(["Km", "km"]);
          const codigo = getColumnValue(["Código da Placa", "Codigo da Placa", "codigo"]);
          return km !== null || codigo !== null;
        } else if (inventoryType === "cilindros") {
          const kmInicial = getColumnValue(["Km Inicial", "km inicial", "km_inicial"]);
          const corCorpo = getColumnValue(["Cor (Corpo)", "Cor Corpo", "cor_corpo"]);
          return kmInicial !== null || corCorpo !== null;
        } else if (inventoryType === "tachas") {
          const kmInicial = getColumnValue(["Km Inicial", "km inicial", "km_inicial"]);
          const quantidade = getColumnValue(["Quantidade", "quantidade"]);
          return kmInicial !== null || quantidade !== null;
        } else if (inventoryType === "marcas_longitudinais") {
          const kmInicial = getColumnValue(["Km Inicial", "km inicial", "km_inicial"]);
          const codigo = getColumnValue(["Código", "Codigo", "codigo"]);
          return kmInicial !== null || codigo !== null;
        } else if (inventoryType === "inscricoes") {
          const km = getColumnValue(["Km", "km"]);
          const sigla = getColumnValue(["Sigla", "sigla"]);
          return km !== null || sigla !== null;
        } else if (inventoryType === "porticos") {
          const km = getColumnValue(["Km", "km"]);
          const tipo = getColumnValue(["Tipo", "tipo"]);
          return km !== null || tipo !== null;
        } else if (inventoryType === "defensas") {
          const kmInicial = getColumnValue(["Km Inicial", "km inicial", "km_inicial"]);
          const tramo = getColumnValue(["Tramo", "tramo"]);
          return kmInicial !== null || tramo !== null;
        }
        
        // Fallback: verificar se há pelo menos um valor não vazio na linha
        return row.some((cell: any) => {
          return cell !== null && 
                 cell !== undefined && 
                 cell !== '' && 
                 String(cell).trim() !== '';
        });
      });

      // Log de debug para filtro de linhas
      console.log(`=== FILTRO DE LINHAS (${inventoryType}) ===`);
      console.log(`Linhas totais no Excel: ${jsonData.length}`);
      console.log(`Linhas após filtro: ${dataRows.length}`);
      console.log(`Primeiras 3 linhas filtradas:`, dataRows.slice(0, 3));

      // Validar se há dados após filtro
      if (dataRows.length === 0) {
        toast.error("Planilha vazia: nenhum registro válido encontrado");
        return;
      }

      // Log para debug
      console.log(`=== COLUNAS DISPONÍVEIS NO EXCEL (${inventoryType}) ===`);
      console.log("Total de registros após filtrar vazios:", dataRows.length);
      console.log("Nomes das colunas:", headers);
      console.log("Primeira linha de dados:", dataRows[0]);
      console.log("===============================");

      toast.success(`${dataRows.length} registros encontrados na planilha`);

      // Normalizar dados - criar objeto com nomes de coluna E manter array para acesso por índice
      const normalizedData = dataRows.map((row: any) => {
        // Criar objeto mapeado com os nomes das colunas
        const mappedRow: any = {};
        headers.forEach((header: any, index: number) => {
          if (header) {
            // Normalizar nome da coluna (remover espaços extras)
            const normalizedKey = String(header).replace(/\s+/g, ' ').trim();
            mappedRow[normalizedKey] = row[index];
          }
        });
        // Adicionar array original para acesso por índice (para foto)
        mappedRow._rowArray = row;
        return mappedRow;
      });

      console.log("=== PRIMEIRA LINHA NORMALIZADA ===");
      if (normalizedData.length > 0) {
        console.log("Chaves da primeira linha:", Object.keys(normalizedData[0]).filter(k => k !== '_rowArray'));
        console.log("Array da primeira linha:", normalizedData[0]._rowArray);
      }

      // 2. Upload das fotos e criar mapeamento
      const photoUrls: Record<string, string> = {};
      const photoArray = photos ? Array.from(photos) : [];
      const fotosUploadadasLocal: string[] = [];

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

      // Se não há fotos para upload, buscar fotos existentes no bucket
      if (hasPhotos && photoArray.length === 0) {
        setProgress("Buscando fotos já existentes no bucket...");
        
        // Buscar em múltiplos níveis do bucket
        const paths = ['', inventoryType, 'inventario'];
        let allFiles: any[] = [];
        
        for (const path of paths) {
          const { data: files, error: listError } = await supabase.storage
            .from(bucketName)
            .list(path, { limit: 1000 });

          if (!listError && files) {
            allFiles = allFiles.concat(files.map(f => ({ ...f, path })));
          }
        }

        const normalizeSpaces = (str: string) => str.replace(/\s+\(/g, '(').trim();
        
        for (const file of allFiles) {
          const fullPath = file.path ? `${file.path}/${file.name}` : file.name;
          const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fullPath);

          // Extrair nome do arquivo sem caminho e sem extensão
          const fileName = file.name.split('/').pop() || file.name;
          const nomeSemExtensao = fileName.replace(/\.[^/.]+$/, "").replace(/^\d+_/, "").trim();
          
          // Variações
          const variacoes = [
            nomeSemExtensao,
            normalizeSpaces(nomeSemExtensao),
            nomeSemExtensao.toLowerCase(),
            normalizeSpaces(nomeSemExtensao.toLowerCase()),
            nomeSemExtensao.toUpperCase(),
            normalizeSpaces(nomeSemExtensao.toUpperCase()),
            fileName,
            normalizeSpaces(fileName),
            fileName.toLowerCase(),
            normalizeSpaces(fileName.toLowerCase()),
            fileName.toUpperCase(),
            normalizeSpaces(fileName.toUpperCase()),
          ];

          variacoes.forEach(variacao => {
            photoUrls[variacao] = urlData.publicUrl;
          });
        }
        
        if (allFiles.length > 0) {
          toast.success(`${allFiles.length} fotos encontradas no bucket`);
          console.log("=== FOTOS CARREGADAS DO BUCKET ===");
          console.log("Total:", allFiles.length);
          console.log("Primeiras 5 chaves:", Object.keys(photoUrls).slice(0, 5));
        } else {
          toast.error("Nenhuma foto encontrada no bucket");
        }
      } else if (hasPhotos && photoArray.length > 0) {
        setProgress(`Fazendo upload de ${photoArray.length} fotos...`);

        for (let i = 0; i < photoArray.length; i++) {
          const photo = photoArray[i];
          const timestamp = Date.now();
          const photoPath = `${inventoryType}/${timestamp}_${photo.name}`;

          const { error: photoError } = await supabase.storage
            .from(bucketName)
            .upload(photoPath, photo);

          if (!photoError) {
            // Rastrear foto uploadada
            fotosUploadadasLocal.push(photoPath);
            const { data: urlData } = supabase.storage
              .from(bucketName)
              .getPublicUrl(photoPath);

            const normalizeSpaces = (str: string) => str.replace(/\s+\(/g, '(').trim();
            
            const nomeCompleto = photo.name;
            const nomeSemExtensao = nomeCompleto.replace(/\.[^/.]+$/, "").trim();
            
            const variacoes = [
              nomeSemExtensao,
              normalizeSpaces(nomeSemExtensao),
              nomeSemExtensao.toLowerCase(),
              normalizeSpaces(nomeSemExtensao.toLowerCase()),
              nomeSemExtensao.toUpperCase(),
              normalizeSpaces(nomeSemExtensao.toUpperCase()),
              nomeCompleto,
              normalizeSpaces(nomeCompleto),
              nomeCompleto.toLowerCase(),
              normalizeSpaces(nomeCompleto.toLowerCase()),
              nomeCompleto.toUpperCase(),
              normalizeSpaces(nomeCompleto.toUpperCase()),
            ];

            variacoes.forEach(variacao => {
              photoUrls[variacao] = urlData.publicUrl;
            });
          }

          if ((i + 1) % LOG_UPDATE_INTERVAL === 0 || i === photoArray.length - 1) {
            setProgress(`Upload: ${i + 1}/${photoArray.length} fotos`);
          }
        }

        toast.success(`${photoArray.length} fotos carregadas`);
      }

      // 3. Preparar registros para inserção
      setProgress("Preparando dados para importação...");

      const tableName = INVENTORY_TYPES.find(t => t.value === inventoryType)?.table;
      if (!tableName) throw new Error("Tipo de inventário inválido");

      // Log das chaves de fotos disponíveis
      if (hasPhotos && Object.keys(photoUrls).length > 0) {
        console.log("=== FOTOS DISPONÍVEIS PARA MAPEAMENTO ===");
        console.log("Total de fotos carregadas:", Object.keys(photoUrls).length);
        console.log("Primeiras 5 chaves:", Object.keys(photoUrls).slice(0, 5));
        console.log("Coluna de fotos configurada:", photoColumnName);
      }

      // Rastrear fotos vinculadas durante o mapeamento
      const fotosVinculadasLocal = new Set<string>();

      const recordsToInsert = normalizedData.map((row: any, index: number) => {
        const record: Record<string, any> = {
          user_id: user.id,
          lote_id: propLoteId,
          rodovia_id: propRodoviaId,
        };

      // Função para converter letra de coluna para índice
        const columnLetterToIndex = (letter: string): number => {
          let index = 0;
          for (let i = 0; i < letter.length; i++) {
            index = index * 26 + (letter.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
          }
          return index - 1;
        };

        // Log das colunas disponíveis para os primeiros registros
        if (index === 0 && hasPhotos && photoColumnName) {
          const photoIndex = columnLetterToIndex(photoColumnName);
          console.log("=== CONFIGURAÇÃO DE FOTOS ===");
          console.log("Letra da coluna configurada:", photoColumnName);
          console.log("Índice da coluna:", photoIndex);
          console.log("Valor na coluna:", row[photoIndex]);
        }

        // Mapear campos do Excel
        for (const [key, value] of Object.entries(row)) {
          // Ignorar colunas vazias, "__empty" ou valores nulos
          if (!key || key.trim() === "" || key.includes("__empty") || key.includes("__EMPTY") || value === null || value === undefined) continue;

          const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, "_").replace(/[()]/g, "");

          // Para defensas, marcas longitudinais, placas, tachas, inscricoes, cilindros e porticos, não adicionar campos automaticamente (serão mapeados explicitamente depois)
          if (inventoryType !== "defensas" && inventoryType !== "marcas_longitudinais" && inventoryType !== "placas" && inventoryType !== "tachas" && inventoryType !== "inscricoes" && inventoryType !== "cilindros" && inventoryType !== "porticos") {
            record[normalizedKey] = value;
          }
        }
        
        // Processar foto usando índice da coluna (letra convertida para número)
        if (hasPhotos && photoColumnName) {
          const photoIndex = columnLetterToIndex(photoColumnName);
          // Usar o array original da linha para acessar por índice
          const rowArray = (row as any)._rowArray || row;
          const photoFileName = rowArray[photoIndex] as string;
          
          // Log detalhado apenas para os primeiros 3 registros
          if (index < 3) {
            console.log(`[FOTO ${index}] Índice da coluna: ${photoIndex}`);
            console.log(`[FOTO ${index}] Nome do arquivo no Excel: "${photoFileName}"`);
          }
          
          if (photoFileName) {
            // Normalizar espaços antes de parênteses (ex: "D (152)" -> "D(152)")
            const normalizeSpaces = (str: string) => str.replace(/\s+\(/g, '(').trim();
            
            // Tentar match direto primeiro
            let matchedUrl = photoUrls[photoFileName];
            
            // Se não encontrou, tentar variações mais flexíveis
            if (!matchedUrl) {
              const normalizedFileName = normalizeSpaces(String(photoFileName));
              const cleanedFileName = normalizedFileName.replace(/\.[^/.]+$/, "");
              
              // Procurar por matching parcial (case insensitive + normalização de espaços)
              for (const [key, url] of Object.entries(photoUrls)) {
                const normalizedKey = normalizeSpaces(key);
                const cleanedKey = normalizedKey.replace(/\.[^/.]+$/, "");
                if (cleanedKey.toLowerCase() === cleanedFileName.toLowerCase()) {
                  matchedUrl = url;
                  break;
                }
              }
            }
            
            if (matchedUrl) {
              // Rastrear foto vinculada
              const pathMatch = matchedUrl.match(/\/([^/]+\/[^/]+)$/);
              if (pathMatch) {
                fotosVinculadasLocal.add(pathMatch[1]);
              }
              
              // PADRONIZADO: Todos os tipos usam fotos_urls (array)
              if (matchedUrl) {
                fotosVinculadasLocal.add(pathMatch[1]);
                
                // Campo principal: fotos_urls (compatível com Inventário Dinâmico)
                record.fotos_urls = [matchedUrl];
                
                // Compatibilidade com campos legados (se necessário)
                if (inventoryType === "placas") {
                  record.foto_frontal_url = matchedUrl; // Legado
                } else if (inventoryType === "defensas") {
                  record.link_fotografia = matchedUrl;  // Legado
                }
                
                if (index < 3) {
                  console.log(`[FOTO ${index}] ✓✓ Vinculada a fotos_urls[]: ${matchedUrl.substring(0, 80)}...`);
                }
              }
              
              if (index < 3) {
                console.log(`[FOTO ${index}] ✓✓ URL mapeada: ${matchedUrl.substring(0, 80)}...`);
              }
            } else if (index < 3) {
              console.log(`[FOTO ${index}] ✗ Não encontrou match para "${photoFileName}"`);
              console.log(`[FOTO ${index}] Primeiras 5 chaves disponíveis:`, Object.keys(photoUrls).slice(0, 5));
            }
            
            // Para defensas, extrair data da foto do nome do arquivo
            if (inventoryType === "defensas" && photoFileName && record.link_fotografia) {
              // Tentar extrair data do nome do arquivo (formato: YYYYMMDD ou DD-MM-YYYY)
              const dateMatch = photoFileName.match(/(\d{8})|(\d{2}[-_]\d{2}[-_]\d{4})/);
              if (dateMatch) {
                let dateStr = dateMatch[0];
                if (dateStr.length === 8) {
                  // Formato YYYYMMDD
                  const year = dateStr.substring(0, 4);
                  const month = dateStr.substring(4, 6);
                  const day = dateStr.substring(6, 8);
                  record.data_vistoria = `${year}-${month}-${day}`;
                } else {
                  // Formato DD-MM-YYYY ou DD_MM_YYYY
                  const parts = dateStr.split(/[-_]/);
                  if (parts.length === 3) {
                    record.data_vistoria = `${parts[2]}-${parts[1]}-${parts[0]}`;
                  }
                }
              }
            }
          }
        }

        // Adicionar valores padrão para defensas
        if (inventoryType === "defensas") {
          const excelRow = row as any;
          
          // Helper para buscar valor com variações de nome
          const getVal = (...keys: string[]) => {
            for (const key of keys) {
              // Tentar com a chave original
              if (excelRow[key] !== undefined && excelRow[key] !== null && excelRow[key] !== "") return excelRow[key];
              
              // Tentar normalizando espaços extras da chave buscada
              const normalizedSearchKey = key.replace(/\s+/g, ' ').trim();
              
              // Procurar nas chaves do Excel normalizando espaços (excluir _rowArray)
              for (const excelKey of Object.keys(excelRow).filter(k => k !== '_rowArray')) {
                const normalizedExcelKey = excelKey.replace(/\s+/g, ' ').trim();
                if (normalizedExcelKey === normalizedSearchKey || 
                    normalizedExcelKey.toLowerCase() === normalizedSearchKey.toLowerCase()) {
                  const value = excelRow[excelKey];
                  if (value !== undefined && value !== null && value !== "") return value;
                }
              }
            }
            return null;
          };
          
          // Helper para limpar valores com porcentagem e converter para número
          const cleanPercentage = (value: any): number | null => {
            if (value === null || value === undefined || value === "") return null;
            const strValue = String(value).trim();
            if (strValue.includes('%')) {
              const cleanValue = strValue.replace('%', '').replace(',', '.').trim();
              const numValue = parseFloat(cleanValue);
              console.log(`[PERCENT CLEAN] Original: "${strValue}" -> Limpo: ${numValue}`);
              return isNaN(numValue) ? null : numValue;
            }
            const numValue = parseFloat(strValue);
            return isNaN(numValue) ? null : numValue;
          };
          
          // Mapeamento conforme dicionário (com variações)
          record.br = getVal("BR", "br");
          record.snv = getVal("SNV", "snv");
          record.tramo = getVal("Tramo", "tramo", "Tr") || "";
          record.lado = getVal("Lado", "lado") || "";
          
          // Localização
          const kmIni = getVal("Km Inicial", "Km inicial", "km_inicial", "km inicial");
          record.km_inicial = kmIni ? Number(kmIni) : 0;
          
          const kmFim = getVal("Km Final", "Km final", "km_final", "km final");
          record.km_final = kmFim ? Number(kmFim) : 0;
          
          record.latitude_inicial = getVal("Latitude Incial", "Latitude Inicial", "Latitude inicial", "latitude_inicial");
          record.longitude_inicial = getVal("Longitude Inicial", "Longitude inicial", "longitude_inicial");
          record.latitude_final = getVal("Latitude Final", "Latitude final", "latitude_final");
          record.longitude_final = getVal("Longitude Final", "Longitude final", "longitude_final");
          
          // Dimensões
          record.quantidade_laminas = getVal("Quantidade Lâminas", "Quantidade Laminas", "quantidade_laminas");
          const compTotal = getVal("Comprimento Total do Tramo (m)", "Comprimento Total do Tramo m", "comprimento_total_tramo_m");
          record.comprimento_total_tramo_m = compTotal;
          record.extensao_metros = compTotal || 0;
          
          // Características
          record.funcao = getVal("Função", "Funcao", "função", "funcao");
          record.especificacao_obstaculo_fixo = getVal("Especificação do Obstáculo Fixo", "Especificacao do Obstaculo Fixo");
          record.id_defensa = getVal("ID", "id", "id_defensa");
          record.distancia_pista_obstaculo_m = getVal("Distância da pista ao obstáculo (m)", "Distancia da pista ao obstaculo m");
          record.risco = getVal("Risco", "risco");
          record.velocidade_kmh = cleanPercentage(getVal("Velocidade (km/h)", "Velocidade km/h", "velocidade_kmh"));
          record.vmd_veic_dia = cleanPercentage(getVal("VMD (veíc./dia)", "VMD veic/dia", "vmd_veic_dia"));
          record.percentual_veiculos_pesados = cleanPercentage(getVal("% Veículos Pesados", "% Veiculos Pesados", "% veículos pesados", "percentual_veiculos_pesados"));
          record.geometria = getVal("Geometria", "geometria");
          record.classificacao_nivel_contencao = getVal("Classificação do nível de Contenção", "Classificacao do nivel de Contencao");
          record.nivel_contencao_en1317 = getVal("Nível de contenção EN 1317-2", "Nivel de contencao EN 1317-2");
          record.nivel_contencao_nchrp350 = getVal("Nível de contenção NCHRP 350", "Nivel de contencao NCHRP 350");
          record.espaco_trabalho = getVal("Espaço de Trabalho", "Espaco de Trabalho");
          record.terminal_entrada = getVal("Terminal de Entrada", "terminal_entrada");
          record.terminal_saida = getVal("Terminal de Saída", "Terminal de Saida", "terminal_saida");
          record.adequacao_funcionalidade_lamina = getVal("Adequação à funcionalidade - Lâmina", "Adequacao a funcionalidade - Lamina");
          record.adequacao_funcionalidade_laminas_inadequadas = getVal("Adequação à funcionalidade - Lâminas inadequadas", "Adequacao a funcionalidade - Laminas inadequadas");
          record.adequacao_funcionalidade_terminais = getVal("Adequação à funcionalidade - Terminais", "Adequacao a funcionalidade - Terminais");
          record.adequacao_funcionalidade_terminais_inadequados = getVal("Adequação à funcionalidade - Terminais inadequados", "Adequacao a funcionalidade - Terminais inadequados");
          record.distancia_face_defensa_obstaculo_m = getVal("Distância da face da defensa ao obstáculo(m)", "Distancia da face da defensa ao obstaculo m");
          record.distancia_bordo_pista_face_defensa_m = getVal("Distância da linha de bordo da pista à face da defensa (m)", "Distancia da linha de bordo da pista a face da defensa m");
          record.link_fotografia = getVal("Link da Fotografia", "Link da Fotografia", "link_fotografia");
          
          if (!record.data_vistoria) {
            record.data_vistoria = new Date().toISOString().split('T')[0];
          }
        }

        // Adicionar mapeamento específico para marcas longitudinais
        if (inventoryType === "marcas_longitudinais") {
          const excelRow = row as any;
          
          // Helper para buscar valor com variações de nome
          const getVal = (...keys: string[]) => {
            for (const key of keys) {
              // Tentar com a chave original
              if (excelRow[key] !== undefined && excelRow[key] !== null && excelRow[key] !== "") return excelRow[key];
              
              // Tentar normalizando espaços extras da chave buscada
              const normalizedSearchKey = key.replace(/\s+/g, ' ').trim();
              
              // Procurar nas chaves do Excel normalizando espaços (excluir _rowArray)
              for (const excelKey of Object.keys(excelRow).filter(k => k !== '_rowArray')) {
                const normalizedExcelKey = excelKey.replace(/\s+/g, ' ').trim();
                if (normalizedExcelKey === normalizedSearchKey || 
                    normalizedExcelKey.toLowerCase() === normalizedSearchKey.toLowerCase()) {
                  const value = excelRow[excelKey];
                  if (value !== undefined && value !== null && value !== "") return value;
                }
              }
            }
            return null;
          };
          
          // Mapeamento conforme dicionário (com variações)
          record.snv = getVal("SNV", "snv");
          record.tipo_demarcacao = getVal("Código", "Codigo", "código", "codigo");
          record.cor = getVal("Cor", "cor") || "Branca";
          
          // Largura da Faixa (m) -> converter para cm
          const larguraM = getVal("Largura da Faixa (m)", "Largura da Faixa m", "Largura da Faixa", "largura_da_faixa_m", "largura");
          record.largura_cm = larguraM && larguraM !== "-" && !isNaN(Number(larguraM)) ? Number(larguraM) * 100 : null;
          
          // Localização
          const kmIni = getVal("Km Inicial", "Km inicial", "km_inicial", "km inicial");
          record.km_inicial = kmIni && kmIni !== "-" ? Number(kmIni) : 0;
          
          const latIni = getVal("Latitude Inicial", "Latitude inicial", "latitude_inicial", "latitude inicial");
          record.latitude_inicial = latIni && latIni !== "-" ? Number(latIni) : null;
          
          const lngIni = getVal("Longitude Inicial", "Longitude inicial", "longitude_inicial", "longitude inicial");
          record.longitude_inicial = lngIni && lngIni !== "-" ? Number(lngIni) : null;
          
          const kmFim = getVal("Km Final", "Km final", "km_final", "km final");
          record.km_final = kmFim && kmFim !== "-" ? Number(kmFim) : 0;
          
          const latFim = getVal("Latitude Final", "Latitude final", "latitude_final", "latitude final");
          record.latitude_final = latFim && latFim !== "-" ? Number(latFim) : null;
          
          const lngFim = getVal("Longitude Final", "Longitude final", "longitude_final", "longitude final");
          record.longitude_final = lngFim && lngFim !== "-" ? Number(lngFim) : null;
          
          // Extensão (km) -> converter para metros
          const extensaoKm = getVal("Extensão (km)", "Extensão km", "Extensão", "extensao_km", "extensao", "Extensao (km)", "Extensao km", "Extensao");
          record.extensao_metros = extensaoKm && extensaoKm !== "-" && !isNaN(Number(extensaoKm)) ? Number(extensaoKm) * 1000 : null;
          
          // Material
          record.material = getVal("Material", "material");
          
          // Montar campos adicionais do dicionário
          const br = getVal("BR", "br");
          const posicao = getVal("Posição", "Posicao", "posição", "posicao");
          const traco = getVal("Traço (m)", "Traço", "traco_m", "traco");
          const espacamento = getVal("Espaçamento (m)", "Espaçamento", "espacamento_m", "espacamento");
          const outrosMat = getVal("Outros materiais", "Outros Materiais", "outros_materiais");
          const area = getVal("Área (m²)", "Área", "area_m2", "area");
          
          // Mapear para campos corretos da tabela
          if (posicao && posicao !== "-") record.posicao = posicao;
          if (traco && traco !== "-") record.traco_m = Number(traco);
          if (espacamento && espacamento !== "-") record.espacamento_m = Number(espacamento);
          if (area && area !== "-") record.area_m2 = Number(area);
          
          record.espessura_cm = null;
          record.data_vistoria = new Date().toISOString().split('T')[0];
        }

        // Adicionar mapeamento específico para placas
        if (inventoryType === "placas") {
          const excelRow = row as any;
          
          // Log das chaves disponíveis para debug (apenas primeira linha)
          if (index === 0) {
            const availableKeys = Object.keys(excelRow).filter(k => !k.startsWith('_') && !k.startsWith('__'));
            console.log("=== PLACAS: Chaves disponíveis no Excel ===", availableKeys);
            console.log("=== PLACAS: Primeiros 5 valores ===");
            availableKeys.slice(0, 5).forEach(key => {
              console.log(`  ${key}: ${excelRow[key]}`);
            });
          }
          
          // Helper para buscar valor com variações de nome
          const getVal = (...keys: string[]) => {
            for (const key of keys) {
              // Tentar com a chave original (case-sensitive)
              if (excelRow[key] !== undefined && excelRow[key] !== null && excelRow[key] !== "") {
                return excelRow[key];
              }
              
              // Tentar normalizando espaços extras da chave buscada
              const normalizedSearchKey = key.replace(/\s+/g, ' ').trim();
              
              // Procurar nas chaves do Excel normalizando espaços e case-insensitive
              for (const excelKey of Object.keys(excelRow)) {
                // Pular propriedades internas
                if (excelKey.startsWith('_') || excelKey.startsWith('__')) continue;
                
                const normalizedExcelKey = excelKey.replace(/\s+/g, ' ').trim();
                if (normalizedExcelKey === normalizedSearchKey || 
                    normalizedExcelKey.toLowerCase() === normalizedSearchKey.toLowerCase()) {
                  const value = excelRow[excelKey];
                  if (value !== undefined && value !== null && value !== "") {
                    return value;
                  }
                }
              }
            }
            return null;
          };
          
          record.br = getVal("BR", "br");
          record.snv = getVal("SNV", "snv");
          record.tipo = getVal("Tipo de placa", "Tipo de Placa", "tipo_de_placa", "tipo");
          record.codigo = getVal("Código da placa", "Codigo da placa", "código_da_placa", "codigo_da_placa", "codigo");
          record.velocidade = getVal("Velocidade", "velocidade") ? String(getVal("Velocidade", "velocidade")) : null;
          record.lado = getVal("Lado", "lado");
          record.posicao = getVal("Posição", "Posicao", "posição", "posicao");
          const kmValue = getVal("Km", "km");
          record.km_inicial = kmValue ? Number(kmValue) : null;
          record.latitude_inicial = getVal("Latitude", "latitude");
          record.longitude_inicial = getVal("Longitude", "longitude");
          record.detalhamento_pagina = getVal("Detalhamento (página)", "Detalhamento pagina", "detalhamento") ? Number(getVal("Detalhamento (página)", "Detalhamento pagina", "detalhamento")) : null;
          
          record.suporte = getVal("Tipo de Suporte", "Tipo de suporte", "tipo_de_suporte", "suporte");
          record.qtde_suporte = getVal("Quantidade de Suporte", "Quantidade de suporte", "quantidade_de_suporte", "qtde_suporte") ? Number(getVal("Quantidade de Suporte", "Quantidade de suporte", "quantidade_de_suporte")) : null;
          record.tipo_secao_suporte = getVal("Tipo de Seção de Suporte", "Tipo de Secao de Suporte", "tipo_secao_suporte");
          record.secao_suporte_mm = getVal("Seção do Suporte (mm)", "Secao do Suporte mm", "secao_suporte_mm");
          
          record.substrato = getVal("Tipo de Substrato", "Tipo de substrato", "tipo_de_substrato", "substrato");
          record.si_sinal_impresso = getVal("SI (Sinal Impresso)", "SI Sinal Impresso", "si");
          
          record.tipo_pelicula_fundo = getVal("Tipo (película fundo)", "Tipo pelicula fundo", "tipo_pelicula_fundo");
          record.cor_pelicula_fundo = getVal("Cor (película fundo)", "Cor pelicula fundo", "cor_pelicula_fundo");
          record.retro_pelicula_fundo = getVal("Retrorrefletância (película fundo) (cd.lux/m-2)", "Retrorrefletância (película fundo)", "Retrorrefletancia pelicula fundo", "cd.lux/m-2") ? Number(getVal("Retrorrefletância (película fundo) (cd.lux/m-2)", "Retrorrefletância (película fundo)", "Retrorrefletancia pelicula fundo", "cd.lux/m-2")) : null;
          
          record.tipo_pelicula_legenda_orla = getVal("Tipo (película legenda/orla)", "Tipo pelicula legenda/orla", "tipo_pelicula_legenda_orla");
          record.cor_pelicula_legenda_orla = getVal("Cor (película legenda/orla)", "Cor pelicula legenda/orla", "cor_pelicula_legenda_orla");
          record.retro_pelicula_legenda_orla = getVal("Retrorrefletância (película legenda/orla) (cd.lux/m-2)", "Retrorrefletância (película legenda/orla)", "Retrorrefletancia pelicula legenda/orla") ? Number(getVal("Retrorrefletância (película legenda/orla) (cd.lux/m-2)", "Retrorrefletância (película legenda/orla)", "Retrorrefletancia pelicula legenda/orla")) : null;
          
          const larguraM = getVal("Largura (m)", "Largura(m)", "Largura m", "Largura  (m)", "largura_m", "largura");
          const alturaM = getVal("Altura (m)", "Altura(m)", "Altura m", "Altura  (m)", "altura_m", "altura");
          record.largura_m = larguraM ? Number(larguraM) : null;
          record.altura_m = alturaM && alturaM !== "-" ? Number(alturaM) : null;
          record.area_m2 = getVal("Área (m²)", "Area m2", "area") ? Number(getVal("Área (m²)", "Area m2", "area")) : null;
          
          if (larguraM) {
            if (alturaM && alturaM !== "-") {
              // Placa retangular: LARGURAxALTURA
              record.dimensoes_mm = `${(Number(larguraM) * 1000).toFixed(0)}x${(Number(alturaM) * 1000).toFixed(0)}`;
            } else {
              // Placa circular: apenas diâmetro
              record.dimensoes_mm = `${(Number(larguraM) * 1000).toFixed(0)}`;
            }
          }
          
          record.link_fotografia = getVal("Link da Fotografia", "Link da fotografia", "link_fotografia");
          record.data_vistoria = new Date().toISOString().split('T')[0];
          
          // IMPORTANTE: Para placas, processar múltiplas fotos se a coluna for especificada
          // O formato esperado é: "AJ" para foto frontal, "AK" para lateral, etc
          // Mas como o sistema atual só suporta uma coluna, vamos processar apenas a principal
          // que será mapeada no processamento genérico de fotos acima (linhas 320-388)
        }

        // Adicionar mapeamento específico para tachas
        if (inventoryType === "tachas") {
          const excelRow = row as any;
          const getVal = (...keys: string[]) => {
            for (const key of keys) {
              // Tentar com a chave original
              if (excelRow[key] !== undefined && excelRow[key] !== null && excelRow[key] !== "") return excelRow[key];
              
              // Tentar normalizando espaços extras da chave buscada
              const normalizedSearchKey = key.replace(/\s+/g, ' ').trim();
              
              // Procurar nas chaves do Excel normalizando espaços (excluir _rowArray)
              for (const excelKey of Object.keys(excelRow).filter(k => k !== '_rowArray')) {
                const normalizedExcelKey = excelKey.replace(/\s+/g, ' ').trim();
                if (normalizedExcelKey === normalizedSearchKey || 
                    normalizedExcelKey.toLowerCase() === normalizedSearchKey.toLowerCase()) {
                  const value = excelRow[excelKey];
                  if (value !== undefined && value !== null && value !== "") return value;
                }
              }
            }
            return null;
          };
          
          // Helper para converter valores numéricos de forma segura
          const toNumber = (value: any): number | null => {
            if (value === null || value === undefined || value === "" || value === "-") return null;
            const str = String(value).trim().toLowerCase();
            if (str === "não se aplica" || str === "nao se aplica" || str === "n/a") return null;
            const num = Number(value);
            return isNaN(num) ? null : num;
          };
          
          record.descricao = getVal("Descrição", "Descricao", "descrição", "descricao", "DESCRIÇÃO", "DESCRICAO");
          record.snv = getVal("SNV", "snv");
          record.corpo = getVal("Corpo", "corpo");
          record.tipo_refletivo = getVal("Refletivo", "refletivo", "tipo_refletivo");
          record.cor_refletivo = getVal("Cor do refletivo", "Cor do Refletivo", "cor_do_refletivo", "cor_refletivo");
          
          const kmIni = getVal("Km Inicial", "Km inicial", "km_inicial", "km inicial");
          record.km_inicial = toNumber(kmIni) ?? 0;
          record.latitude_inicial = toNumber(getVal("Latitude Inicial", "Latitude inicial", "latitude_inicial"));
          record.longitude_inicial = toNumber(getVal("Longitude Inicial", "Longitude inicial", "longitude_inicial"));
          
          const kmFim = getVal("km Final", "Km Final", "Km final", "km_final", "km final");
          record.km_final = toNumber(kmFim) ?? 0;
          record.latitude_final = toNumber(getVal("Latitude Final", "Latitude final", "latitude_final"));
          record.longitude_final = toNumber(getVal("Longitude Final", "Longitude final", "longitude_final"));
          
          const extKm = getVal("Extensão (km)", "Extensão km", "Extensao km", "extensao_km", "extensao");
          record.extensao_km = toNumber(extKm);
          
          record.local_implantacao = getVal("Local de implantação", "Local de Implantação", "Local de implantacao", "local_implantacao");
          
          const espac = getVal("Espaçamento", "Espacamento", "espaçamento", "espacamento");
          record.espacamento_m = toNumber(espac);
          
          const qtd = getVal("Quantidade", "quantidade");
          record.quantidade = toNumber(qtd) ?? 1;
          
          record.data_vistoria = new Date().toISOString().split('T')[0];
        }

        // Adicionar mapeamento específico para inscrições
        if (inventoryType === "inscricoes") {
          const excelRow = row as any;
          const getVal = (...keys: string[]) => {
            for (const key of keys) {
              // Tentar com a chave original
              if (excelRow[key] !== undefined && excelRow[key] !== null && excelRow[key] !== "") return excelRow[key];
              
              // Tentar normalizando espaços extras da chave buscada
              const normalizedSearchKey = key.replace(/\s+/g, ' ').trim();
              
              // Procurar nas chaves do Excel normalizando espaços (excluir _rowArray)
              for (const excelKey of Object.keys(excelRow).filter(k => k !== '_rowArray')) {
                const normalizedExcelKey = excelKey.replace(/\s+/g, ' ').trim();
                if (normalizedExcelKey === normalizedSearchKey || 
                    normalizedExcelKey.toLowerCase() === normalizedSearchKey.toLowerCase()) {
                  const value = excelRow[excelKey];
                  if (value !== undefined && value !== null && value !== "") return value;
                }
              }
            }
            return null;
          };
          
          const siglaRaw = getVal("Sigla", "sigla");
          const descricaoRaw = getVal("Descrição", "Descricao", "descrição", "descricao");
          
          // Se vier junto no formato "SIGLA - Descrição", separar
          let sigla = siglaRaw;
          let tipo_inscricao = descricaoRaw;
          
          if (siglaRaw && siglaRaw.includes(" - ")) {
            const partes = siglaRaw.split(" - ");
            sigla = partes[0].trim();
            tipo_inscricao = partes.slice(1).join(" - ").trim();
          } else if (descricaoRaw && descricaoRaw.includes(" - ") && !siglaRaw) {
            const partes = descricaoRaw.split(" - ");
            sigla = partes[0].trim();
            tipo_inscricao = partes.slice(1).join(" - ").trim();
          }
          
          // Mapear campos diretamente
          record.sigla = sigla || null;
          record.snv = getVal("SNV", "snv") || null;
          record.tipo_inscricao = tipo_inscricao || "Não especificado";
          record.cor = getVal("Cor", "cor") || "Branca";
          
          const km = getVal("Km", "km");
          record.km_inicial = km ? Number(km) : null;
          
          const lat = getVal("Latitude", "latitude");
          const lng = getVal("Longitude", "longitude");
          record.latitude_inicial = lat;
          record.longitude_inicial = lng;
          
          record.material_utilizado = getVal("Material", "material");
          record.dimensoes = getVal("Dimensões", "Dimensoes", "dimensões", "dimensoes");
          
          const area = getVal("Área (m²)", "Area m2", "Área", "area");
          record.area_m2 = area ? Number(area) : null;
          
          // Observação apenas com BR
          const br = getVal("BR", "br");
          record.observacao = br ? `BR: ${br}` : null;
          
          record.data_vistoria = new Date().toISOString().split('T')[0];
        }

        // Adicionar mapeamento específico para cilindros delimitadores
        if (inventoryType === "cilindros") {
          const excelRow = row as any;
          const getVal = (...keys: string[]) => {
            for (const key of keys) {
              // Tentar com a chave original
              if (excelRow[key] !== undefined && excelRow[key] !== null && excelRow[key] !== "") return excelRow[key];
              
              // Tentar normalizando espaços extras da chave buscada
              const normalizedSearchKey = key.replace(/\s+/g, ' ').trim();
              
              // Procurar nas chaves do Excel normalizando espaços (excluir _rowArray)
              for (const excelKey of Object.keys(excelRow).filter(k => k !== '_rowArray')) {
                const normalizedExcelKey = excelKey.replace(/\s+/g, ' ').trim();
                if (normalizedExcelKey === normalizedSearchKey || 
                    normalizedExcelKey.toLowerCase() === normalizedSearchKey.toLowerCase()) {
                  const value = excelRow[excelKey];
                  if (value !== undefined && value !== null && value !== "") return value;
                }
              }
            }
            return null;
          };
          
          // Helper para converter valores numéricos de forma segura
          const toNumber = (value: any): number | null => {
            if (value === null || value === undefined || value === "" || value === "-") return null;
            const str = String(value).trim().toLowerCase();
            if (str === "não se aplica" || str === "nao se aplica" || str === "n/a") return null;
            const num = Number(value);
            return isNaN(num) ? null : num;
          };
          
          record.snv = getVal("SNV", "snv");
          record.local_implantacao = getVal("Local de Implantação", "Local de Implantacao", "Local de implantação", "local_implantacao");
          record.cor_corpo = getVal("Cor (Corpo)", "Cor Corpo", "cor_corpo") || "Não especificado";
          record.cor_refletivo = getVal("Cor (Refletivo)", "Cor Refletivo", "cor_refletivo");
          record.tipo_refletivo = getVal("Tipo Refletivo", "tipo_refletivo");
          
          const kmIni = getVal("Km Inicial", "Km inicial", "km_inicial", "km inicial");
          record.km_inicial = toNumber(kmIni) ?? 0;
          record.latitude_inicial = toNumber(getVal("Latitude Inicial", "Latitude inicial", "latitude_inicial"));
          record.longitude_inicial = toNumber(getVal("Longitude Inicial", "Longitude inicial", "longitude_inicial"));
          
          const kmFim = getVal("km Final", "Km Final", "Km final", "km_final", "km final");
          record.km_final = toNumber(kmFim) ?? 0;
          record.latitude_final = toNumber(getVal("Latitude Final", "Latitude final", "latitude_final"));
          record.longitude_final = toNumber(getVal("Longitude Final", "Longitude final", "longitude_final"));
          
          const extKm = getVal("Extensão (km)", "Extensão km", "Extensao km", "extensao_km", "extensao");
          record.extensao_km = toNumber(extKm);
          
          const espac = getVal("Espaçamento (m)", "Espaçamento", "Espacamento (m)", "Espacamento", "espaçamento", "espacamento");
          record.espacamento_m = toNumber(espac);
          
          const qtd = getVal("Quantidade (und)", "Quantidade", "quantidade");
          record.quantidade = toNumber(qtd);
          
          const br = getVal("BR", "br");
          if (br) {
            record.observacao = `BR: ${br}`;
          }
          
          record.data_vistoria = new Date().toISOString().split('T')[0];
        }

        // Adicionar mapeamento específico para pórticos
        if (inventoryType === "porticos") {
          const excelRow = row as any;
          const getVal = (...keys: string[]) => {
            for (const key of keys) {
              // Tentar com a chave original
              if (excelRow[key] !== undefined && excelRow[key] !== null && excelRow[key] !== "") return excelRow[key];
              
              // Tentar normalizando espaços extras da chave buscada
              const normalizedSearchKey = key.replace(/\s+/g, ' ').trim();
              
              // Procurar nas chaves do Excel normalizando espaços (excluir _rowArray)
              for (const excelKey of Object.keys(excelRow).filter(k => k !== '_rowArray')) {
                const normalizedExcelKey = excelKey.replace(/\s+/g, ' ').trim();
                if (normalizedExcelKey === normalizedSearchKey || 
                    normalizedExcelKey.toLowerCase() === normalizedSearchKey.toLowerCase()) {
                  const value = excelRow[excelKey];
                  if (value !== undefined && value !== null && value !== "") return value;
                }
              }
            }
            return null;
          };
          
          record.snv = getVal("SNV", "snv");
          record.tipo = getVal("Tipo", "tipo") || "Pórtico";
          
          const alturaLivre = getVal("Altura Livre (m)", "Altura Livre m", "altura_livre_m", "altura_livre");
          record.altura_livre_m = alturaLivre ? Number(alturaLivre) : null;
          
          const vao = getVal("Vão Horizontal", "Vao Horizontal", "vão_horizontal", "vao_horizontal_m", "vao_horizontal");
          record.vao_horizontal_m = vao ? Number(vao) : null;
          
          record.lado = getVal("Lado", "lado");
          
          const km = getVal("Km", "km");
          record.km_inicial = km ? Number(km) : null;
          
          record.latitude_inicial = getVal("Latitude", "latitude");
          record.longitude_inicial = getVal("Longitude", "longitude");
          record.foto_url = getVal("Link da Fotografia", "Link da fotografia", "link_fotografia");
          
          record.data_vistoria = new Date().toISOString().split('T')[0];
        }

        return record;
      });

      // 3.5. Validação de duplicatas antes da inserção
      setProgress("Verificando duplicatas...");
      
      const chavesUnicasPorTipo: Record<string, string[]> = {
        placas: ['km', 'codigo', 'lado', 'rodovia_id'],
        marcas_longitudinais: ['km_inicial', 'km_final', 'tipo_demarcacao', 'rodovia_id'],
        cilindros: ['km_inicial', 'cor_corpo', 'rodovia_id'],
        tachas: ['km_inicial', 'refletivo', 'local_implantacao', 'rodovia_id'],
        inscricoes: ['km_inicial', 'sigla', 'tipo_inscricao', 'rodovia_id'],
        porticos: ['km', 'tipo', 'rodovia_id'],
        defensas: ['km_inicial', 'tramo', 'lado', 'rodovia_id'],
      };

      const chavesUnicas = chavesUnicasPorTipo[inventoryType] || [];
      
      // Buscar todos os registros existentes de uma vez (otimizado para grandes volumes)
      const { data: existentes } = await supabase
        .from(tableName as any)
        .select(chavesUnicas.join(',') + ',id')
        .eq('rodovia_id', propRodoviaId);

      // Criar Set de chaves existentes para lookup O(1)
      const existentesSet = new Set(
        (existentes || []).map(e => 
          chavesUnicas.map(campo => String(e[campo] ?? '')).join('|')
        )
      );

      // Filtrar apenas registros novos
      const registrosOriginais = recordsToInsert.length;
      const registrosNovos = recordsToInsert.filter(record => {
        const chave = chavesUnicas.map(campo => String(record[campo] ?? '')).join('|');
        return !existentesSet.has(chave);
      });

      const duplicatasEncontradas = registrosOriginais - registrosNovos.length;

      if (duplicatasEncontradas > 0) {
        const continuar = confirm(
          `⚠️ DUPLICATAS DETECTADAS\n\n` +
          `${duplicatasEncontradas} de ${registrosOriginais} registros já existem no banco.\n\n` +
          `Deseja importar apenas os ${registrosNovos.length} registros novos?\n\n` +
          `Clique OK para continuar apenas com registros novos.\n` +
          `Clique Cancelar para abortar a importação.`
        );
        
        if (!continuar) {
          toast.info("Importação cancelada pelo usuário");
          setImporting(false);
          return;
        }
        
        toast.warning(`${duplicatasEncontradas} duplicatas ignoradas. Importando ${registrosNovos.length} registros novos.`);
      }

      // Usar apenas registros novos
      const finalRecords = registrosNovos;

      if (finalRecords.length === 0) {
        toast.warning("Nenhum registro novo para importar (todos já existem)");
        setImporting(false);
        return;
      }

      // 4. Inserir em lotes
      setProgress("Inserindo dados no banco...");
      let imported = 0;

      for (let i = 0; i < finalRecords.length; i += BATCH_SIZE) {
        const batch = finalRecords.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase
          .from(tableName as any)
          .insert(batch as any);

        if (insertError) {
          console.error("Erro ao inserir batch:", insertError);
          throw insertError;
        }

        imported += batch.length;
        
        // Atualizar progress apenas a cada LOG_UPDATE_INTERVAL registros
        if (imported % LOG_UPDATE_INTERVAL === 0 || imported === finalRecords.length) {
          setProgress(`Importando: ${imported}/${finalRecords.length} registros`);
        }
      }

      // 5. Limpeza automática de fotos órfãs
      let fotosOrfasRemovidas = 0;
      if (hasPhotos && fotosUploadadasLocal.length > 0) {
        const fotosOrfas = fotosUploadadasLocal.filter(path => !fotosVinculadasLocal.has(path));
        
        if (fotosOrfas.length > 0) {
          setProgress(`Limpando ${fotosOrfas.length} fotos não vinculadas...`);
          
          // Deletar em lotes de 100
          for (let i = 0; i < fotosOrfas.length; i += 100) {
            const lote = fotosOrfas.slice(i, i + 100);
            await supabase.storage.from(bucketName).remove(lote);
          }
          
          fotosOrfasRemovidas = fotosOrfas.length;
          console.log(`🧹 Limpeza automática: ${fotosOrfasRemovidas} fotos órfãs removidas`);
        }
      }

      setProgress("");
      
      // Mensagem final com estatísticas
      const mensagemFinal = `Importação concluída! ${imported} registros importados` +
        (hasPhotos && fotosVinculadasLocal.size > 0 ? `, ${fotosVinculadasLocal.size} fotos vinculadas` : '') +
        (fotosOrfasRemovidas > 0 ? `, ${fotosOrfasRemovidas} fotos órfãs removidas automaticamente` : '') +
        '.';
      
      toast.success(mensagemFinal);

      // 🔄 DELETAR Marco Zero - importação invalida o snapshot consolidado
      if (propLoteId && propRodoviaId) {
        const { error: marcoError } = await supabase
          .from("marcos_inventario")
          .delete()
          .eq("lote_id", propLoteId)
          .eq("rodovia_id", propRodoviaId)
          .eq("tipo", "marco_zero");

        if (marcoError) {
          console.warn("⚠️ Aviso ao deletar marco zero:", marcoError);
        } else {
          console.log("✅ Marco Zero deletado - inventário não está mais consolidado");
        }

        // Invalidar query do marco zero
        queryClient.invalidateQueries({ 
          queryKey: ["marco-zero-recente", propLoteId, propRodoviaId] 
        });
      }

      // Registrar no log de importações (upsert para atualizar se já existir)
      const { error: logError } = await supabase
        .from('importacoes_log')
        .upsert({
          lote_id: propLoteId,
          rodovia_id: propRodoviaId,
          tipo_inventario: inventoryType,
          total_registros: imported,
          usuario_id: user.id,
        }, {
          onConflict: 'lote_id,rodovia_id,tipo_inventario',
          ignoreDuplicates: false // Força o UPDATE quando houver conflito
        });

      if (logError) {
        console.error('Erro ao registrar log de importação:', logError);
        toast.warning('Importação concluída, mas log pode não ter sido salvo completamente');
      }

      // Invalidar cache para atualizar o semáforo imediatamente
      await queryClient.invalidateQueries({ 
        queryKey: ["inventory-status", propLoteId, propRodoviaId] 
      });

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
          Importação Genérica de Cadastros (Inventários)
        </CardTitle>
        <CardDescription>
          Importe dados de cadastro a partir de planilhas Excel com ou sem fotos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Este sistema permite importar qualquer tipo de cadastro. Selecione o tipo, faça upload do Excel e, 
            se houver fotos, marque a opção correspondente, informe a letra da coluna do Excel que contém os nomes das fotos (ex: A, B, AA, AB, AC) e selecione as fotos.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {/* Tipo de Elemento */}
          <div className="space-y-2">
            <Label htmlFor="inventory-type">Tipo de Elemento *</Label>
            <Select 
              value={inventoryType} 
              onValueChange={setInventoryType}
              disabled={!propLoteId || !propRodoviaId}
            >
              <SelectTrigger>
                <SelectValue placeholder={!propLoteId || !propRodoviaId ? "Selecione lote e rodovia no topo primeiro" : "Selecione o tipo"} />
              </SelectTrigger>
              <SelectContent>
                {INVENTORY_TYPES.map((type) => {
                  const statusData = inventoryStatus?.find(s => s.tipo === type.value);
                  const total = statusData?.total || 0;
                  const importado = statusData?.importado || false;
                  const status = getStatusIndicator(total, importado);
                    
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>{type.label}</span>
                          <span className={`ml-auto text-xs font-medium ${status.color}`}>
                            {status.icon} {total > 0 ? total : ""}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedType && (
                <p className="text-xs text-muted-foreground">
                  Tabela: {selectedType.table}
                </p>
              )}
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

          {/* Indicador do que está faltando */}
          {!importing && (!inventoryType || !excelFile || !propLoteId || !propRodoviaId) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Para iniciar a importação, você precisa:
                {!inventoryType && <div className="ml-4">✗ Selecionar o tipo de cadastro</div>}
                {!propLoteId && <div className="ml-4">✗ Selecionar o lote no topo da página</div>}
                {!propRodoviaId && <div className="ml-4">✗ Selecionar a rodovia no topo da página</div>}
                {!excelFile && <div className="ml-4">✗ Selecionar o arquivo Excel</div>}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handleImport} 
              disabled={importing || !inventoryType || !excelFile || !propLoteId || !propRodoviaId}
              className="flex-1"
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
                  Importar Cadastro
                </>
              )}
            </Button>
            
            {/* Botão de reset caso fique travado */}
            {importing && (
              <Button 
                onClick={() => {
                  setImporting(false);
                  setProgress("");
                  toast.info("Importação cancelada");
                }}
                variant="outline"
                size="lg"
              >
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}