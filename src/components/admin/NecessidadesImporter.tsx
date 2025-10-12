import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CheckCircle2, XCircle, AlertCircle, Loader2, StopCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";

const TIPOS_NECESSIDADES = [
  { value: "marcas_longitudinais", label: "Marcas Longitudinais" },
  { value: "tachas", label: "Tachas" },
  { value: "marcas_transversais", label: "Zebrados (Marcas Transversais)" },
  { value: "cilindros", label: "Cilindros Delimitadores" },
  { value: "placas", label: "Placas" },
  { value: "porticos", label: "Pórticos" },
  { value: "defensas", label: "Defensas" },
];

interface LogEntry {
  tipo: "success" | "warning" | "error";
  linha: number;
  mensagem: string;
}

export function NecessidadesImporter() {
  const [tipo, setTipo] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loteId, setLoteId] = useState<string>("");
  const [rodoviaId, setRodoviaId] = useState<string>("");
  const { toast } = useToast();
  const cancelImportRef = useRef(false);

  // Buscar lotes
  const { data: lotes } = useQuery({
    queryKey: ["lotes"],
    queryFn: async () => {
      const { data } = await supabase.from("lotes").select("*").order("numero");
      return data || [];
    },
  });

  // Buscar rodovias do lote selecionado
  const { data: rodovias } = useQuery({
    queryKey: ["rodovias", loteId],
    queryFn: async () => {
      if (!loteId) return [];
      const { data } = await supabase
        .from("lotes_rodovias")
        .select("rodovia:rodovias(*)")
        .eq("lote_id", loteId);
      return data?.map(lr => lr.rodovia) || [];
    },
    enabled: !!loteId,
  });

  // Função para converter coordenadas com vírgula para ponto
  const converterCoordenada = (valor: any): number | null => {
    if (!valor) return null;
    
    // Se já é número, retorna
    if (typeof valor === "number") return valor;
    
    // Se é string, substitui vírgula por ponto e converte
    if (typeof valor === "string") {
      const valorLimpo = valor.trim().replace(",", ".");
      const numero = parseFloat(valorLimpo);
      return isNaN(numero) ? null : numero;
    }
    
    return null;
  };

  const identificarServico = (row: any, match: any): string => {
    // SEM match = nova instalação
    if (!match) {
      return "Implantar";
    }

    // COM match - verificar sinais de remoção
    const sinaisRemocao = [
      row.quantidade === 0 || row.quantidade === "0",
      row.extensao_metros === 0 || row.extensao_metros === "0",
      row.acao?.toLowerCase().includes("remov"),
      row.acao?.toLowerCase().includes("desativ"),
    ];

    if (sinaisRemocao.some(Boolean)) {
      return "Remover";
    }

    // Caso contrário = substituição
    return "Substituir";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setLogs([]);
      setProgress(0);
    }
  };

  const mapearColunas = (row: any, tipo: string) => {
    // Para placas, não usar campos do baseMap (não tem inicial/final)
    if (tipo === "placas") {
      return {
        km: row["Km"] || row["KM"] || row["km"] || row["__EMPTY_6"],
        latitude: converterCoordenada(row["Latitude"] || row["latitude"] || row["__EMPTY_7"]),
        longitude: converterCoordenada(row["Longitude"] || row["longitude"] || row["__EMPTY_8"]),
        codigo: row["Código da placa"] || row["Código"] || row["codigo"] || row["__EMPTY_2"],
        modelo: row["Modelo"] || row["modelo"],
        tipo: row["Tipo de placa"] || row["Tipo"] || row["tipo"] || row["__EMPTY_1"],
        velocidade: row["Velocidade"] || row["velocidade"] || row["__EMPTY_3"],
        descricao: row["Descrição"] || row["descricao"],
        lado: row["Lado"] || row["lado"] || row["__EMPTY_4"],
        dimensoes_mm: row["Dimensões (mm)"] || row["dimensoes_mm"],
        substrato: row["Tipo de Substrato"] || row["Substrato"] || row["substrato"] || row["__EMPTY_14"],
        suporte: row["Tipo de Suporte"] || row["Suporte"] || row["suporte"] || row["__EMPTY_10"],
        pelicula: row["Película"] || row["pelicula"],
        snv: row["SNV"] || row["snv"] || row["__EMPTY"],
        observacao: row["Observação"] || row["Observacao"] || row["observacao"],
        solucao_planilha: row["Solução"] || row["Solucao"] || row["solucao"] || row["__EMPTY_25"],
      };
    }

    // Mapeamento básico para outros tipos (com inicial/final)
    const baseMap: any = {
      km_inicial: row["Km Inicial"] || row["KM Inicial"] || row["km_inicial"] || row["__EMPTY_5"],
      km_final: row["Km Final"] || row["KM Final"] || row["km_final"] || row["__EMPTY_8"],
      latitude_inicial: converterCoordenada(row["Latitude Inicial"] || row["Lat Inicial"] || row["latitude_inicial"] || row["__EMPTY_6"]),
      longitude_inicial: converterCoordenada(row["Longitude Inicial"] || row["Long Inicial"] || row["longitude_inicial"] || row["__EMPTY_7"]),
      latitude_final: converterCoordenada(row["Latitude Final"] || row["Lat Final"] || row["latitude_final"] || row["__EMPTY_9"]),
      longitude_final: converterCoordenada(row["Longitude Final"] || row["Long Final"] || row["longitude_final"] || row["__EMPTY_10"]),
      observacao: row["Observação"] || row["Observacao"] || row["observacao"],
      snv: row["SNV"] || row["snv"] || row["__EMPTY_1"],
      solucao_planilha: row["Solução"] || row["Solucao"] || row["solucao"] || row["__EMPTY_25"],
    };

    // Campos específicos por tipo
    switch (tipo) {
      case "marcas_longitudinais":
        return {
          ...baseMap,
          codigo: row["Código"] || row["codigo"] || row["__EMPTY_2"],
          posicao: row["Código"] || row["codigo"] || row["__EMPTY_2"], // Posição é a mesma coluna do código
          tipo_demarcacao: row["Código"] || row["codigo"] || row["__EMPTY_2"],
          largura_cm: (row["Largura da Faixa (m)"] || row["largura_cm"] || row["__EMPTY_4"]) ? 
            parseFloat(String(row["Largura da Faixa (m)"] || row["largura_cm"] || row["__EMPTY_4"]).replace(',', '.')) * 100 : null,
          material: row["Material"] || row["material"] || row["__EMPTY_13"],
          espessura_cm: (row["Espessura (mm)"] || row["espessura_cm"] || row["__EMPTY_14"]) ?
            parseFloat(String(row["Espessura (mm)"] || row["espessura_cm"] || row["__EMPTY_14"]).replace(',', '.')) / 10 : null,
          extensao_metros: (row["Extensão (km)"] || row["extensao_metros"] || row["__EMPTY_16"]) ?
            parseFloat(String(row["Extensão (km)"] || row["extensao_metros"] || row["__EMPTY_16"]).replace(',', '.')) * 1000 : null,
          traco_m: row["Traço (m)"] && row["Traço (m)"] !== "-" ? parseFloat(String(row["Traço (m)"] || row["__EMPTY_11"]).replace(',', '.')) : null,
          espacamento_m: row["Espaçamento (m)"] && row["Espaçamento (m)"] !== "-" ? parseFloat(String(row["Espaçamento (m)"] || row["__EMPTY_12"]).replace(',', '.')) : null,
          area_m2: row["Área (m²)"] ? parseFloat(String(row["Área (m²)"] || row["__EMPTY_17"]).replace(',', '.')) : null,
        };

      case "tachas":
        return {
          ...baseMap,
          quantidade: parseInt(row["Quantidade"] || row["quantidade"]) || null,
          corpo: row["Corpo"] || row["corpo"],
          refletivo: row["Refletivo"] || row["refletivo"],
          cor_refletivo: row["Cor Refletivo"] || row["cor_refletivo"],
          espacamento_m: row["Espaçamento (m)"] || row["espacamento_m"],
          extensao_km: row["Extensão (km)"] || row["extensao_km"],
          local_implantacao: row["Local Implantação"] || row["local_implantacao"],
          descricao: row["Descrição"] || row["descricao"],
        };

      default:
        return baseMap;
    }
  };

  const handleImport = async () => {
    if (!file || !tipo || !loteId || !rodoviaId) {
      toast({
        title: "Erro",
        description: "Selecione o tipo, lote, rodovia e arquivo antes de importar",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setLogs([]);
    setProgress(0);
    cancelImportRef.current = false;

    try {
      // 1. Ler arquivo Excel
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error("Planilha vazia");
      }

      // Filtrar linhas de cabeçalho (que têm texto em campos numéricos)
      const dadosFiltrados = jsonData.filter((row: any) => {
        // Se o campo KM/Km contém texto como "Km", é cabeçalho - pular
        const kmValue = row["__EMPTY_6"] || row["Km"] || row["KM"] || row["km"];
        return kmValue !== undefined && !isNaN(Number(kmValue));
      });

      // 2. Buscar user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 3. Processar cada linha
      const total = dadosFiltrados.length;
      let sucessos = 0;
      let falhas = 0;

      for (let i = 0; i < dadosFiltrados.length; i++) {
        // Verificar se foi cancelado
        if (cancelImportRef.current) {
          setLogs(prev => [...prev, {
            tipo: "warning",
            linha: 0,
            mensagem: "Importação cancelada pelo usuário"
          }]);
          toast({
            title: "Importação Cancelada",
            description: `Processadas ${i} de ${total} linhas antes do cancelamento`,
            variant: "default",
          });
          break;
        }

        const row: any = dadosFiltrados[i];
        const linhaExcel = i + 3; // +3 pois Excel começa em 1, tem header, e pulamos a linha de cabeçalho duplicada

        try {
          // Mapear colunas
          const dados = mapearColunas(row, tipo);

          // Buscar match no cadastro (apenas se houver coordenadas)
          // Converter coordenadas para número (vírgula -> ponto)
          const lat = tipo === "placas" ? converterCoordenada(dados.latitude) : converterCoordenada(dados.latitude_inicial);
          const long = tipo === "placas" ? converterCoordenada(dados.longitude) : converterCoordenada(dados.longitude_inicial);

          let match = null;
          let distancia = null;

          if (lat && long) {
            console.log(`🔍 Linha ${linhaExcel}: Chamando RPC com lat=${lat}, long=${long}, tipo=${tipo}, rodovia=${rodoviaId}`);
            
            const { data: matchData, error: matchError } = await supabase
              .rpc("match_cadastro_por_coordenadas", {
                p_tipo: tipo,
                p_lat: lat,
                p_long: long,
                p_rodovia_id: rodoviaId,
                p_tolerancia_metros: 50,
              });

            if (matchError) {
              console.error(`❌ Linha ${linhaExcel}: Erro na RPC:`, matchError);
            } else if (matchData && matchData.length > 0) {
              match = matchData[0].cadastro_id;
              distancia = matchData[0].distancia_metros;
              console.log(`✅ Linha ${linhaExcel}: Match encontrado! cadastro_id=${match}, distancia=${distancia}m`);
            } else {
              console.log(`⚠️ Linha ${linhaExcel}: RPC retornou vazio (sem match dentro de 50m)`);
            }
          } else {
            console.log(`⚠️ Linha ${linhaExcel}: Sem coordenadas válidas (lat=${lat}, long=${long})`);
          }

          // Usar o serviço da planilha (coluna "Solução")
          let servico: string;
          const solucaoPlanilha = dados.solucao_planilha?.toLowerCase();
          
          if (solucaoPlanilha) {
            // Mapear valores da planilha
            if (solucaoPlanilha.includes("substitu")) {
              servico = "Substituir";
            } else if (solucaoPlanilha.includes("implant")) {
              servico = "Implantar";
            } else if (solucaoPlanilha.includes("remov")) {
              servico = "Remover";
            } else if (solucaoPlanilha.includes("manter")) {
              servico = "Manter";
            } else {
              servico = "Implantar"; // Padrão
            }
          } else {
            // Se não tem solução na planilha, usar lógica de inferência
            servico = identificarServico(dados, match);
          }

          // Inserir necessidade
          const tabelaNecessidade = `necessidades_${tipo}` as 
            | "necessidades_marcas_longitudinais"
            | "necessidades_tachas"
            | "necessidades_marcas_transversais"
            | "necessidades_cilindros"
            | "necessidades_placas"
            | "necessidades_porticos"
            | "necessidades_defensas";

          const { error } = await supabase
            .from(tabelaNecessidade)
            .insert({
              user_id: user.id,
              lote_id: loteId,
              rodovia_id: rodoviaId,
              cadastro_id: match,
              servico,
              ...dados,
              arquivo_origem: file.name,
              linha_planilha: linhaExcel,
              distancia_match_metros: distancia,
            });

          if (error) throw error;

          // Log de sucesso (simples e direto)
          const icon = servico === "Implantar" ? "🟢" : servico === "Substituir" ? "🟡" : servico === "Remover" ? "🔴" : "🔵";
          const matchInfo = match ? ` (${distancia?.toFixed(0)}m)` : "";
          
          setLogs(prev => [...prev, {
            tipo: "success",
            linha: linhaExcel,
            mensagem: `${icon} ${servico}${matchInfo}`
          }]);
          sucessos++;

        } catch (error: any) {
          setLogs(prev => [...prev, {
            tipo: "error",
            linha: linhaExcel,
            mensagem: `Erro: ${error.message}`
          }]);
          falhas++;
        }

        // Atualizar progresso
        setProgress(Math.round(((i + 1) / total) * 100));
      }

      // Resultado final
      toast({
        title: "Importação concluída",
        description: `${sucessos} registros importados, ${falhas} falhas`,
        variant: falhas > 0 ? "destructive" : "default",
      });

    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar Necessidades</CardTitle>
        <CardDescription>
          Importar planilhas de necessidades com match automático ao cadastro
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seleção de tipo */}
        <div className="space-y-2">
          <Label>Tipo de Necessidade</Label>
          <Select value={tipo} onValueChange={setTipo} disabled={isImporting}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_NECESSIDADES.map(t => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Seleção de Lote */}
        <div className="space-y-2">
          <Label>Lote</Label>
          <Select value={loteId} onValueChange={(value) => {
            setLoteId(value);
            setRodoviaId(""); // Limpar rodovia ao mudar lote
          }} disabled={isImporting}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o lote" />
            </SelectTrigger>
            <SelectContent>
              {lotes?.map(lote => (
                <SelectItem key={lote.id} value={lote.id}>
                  {lote.numero}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Seleção de Rodovia */}
        <div className="space-y-2">
          <Label>Rodovia</Label>
          <Select value={rodoviaId} onValueChange={setRodoviaId} disabled={isImporting || !loteId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a rodovia" />
            </SelectTrigger>
            <SelectContent>
              {rodovias?.map((rodovia: any) => (
                <SelectItem key={rodovia.id} value={rodovia.id}>
                  {rodovia.codigo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Upload de arquivo */}
        <div className="space-y-2">
          <Label>Arquivo Excel (.xlsx, .xlsm)</Label>
          <Input
            type="file"
            accept=".xlsx,.xlsm"
            onChange={handleFileChange}
            disabled={isImporting || !tipo}
          />
          {file && (
            <p className="text-sm text-muted-foreground">
              Arquivo selecionado: {file.name}
            </p>
          )}
        </div>

        {/* Botões importar/cancelar */}
        <div className="flex gap-2">
          <Button
            onClick={handleImport}
            disabled={!file || !tipo || !loteId || !rodoviaId || isImporting}
            className="flex-1"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importar
              </>
            )}
          </Button>

          {isImporting && (
            <Button
              onClick={() => {
                cancelImportRef.current = true;
                toast({
                  title: "Cancelando...",
                  description: "A importação será interrompida após a linha atual",
                });
              }}
              variant="destructive"
              className="flex-shrink-0"
            >
              <StopCircle className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          )}
        </div>

        {/* Barra de progresso */}
        {isImporting && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              {progress}% concluído
            </p>
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <Label>Log de Importação</Label>
            <div className="space-y-1">
              {logs.map((log, idx) => (
                <Alert
                  key={idx}
                  variant={log.tipo === "error" ? "destructive" : "default"}
                  className="py-2"
                >
                  {log.tipo === "success" && <CheckCircle2 className="h-4 w-4" />}
                  {log.tipo === "warning" && <AlertCircle className="h-4 w-4" />}
                  {log.tipo === "error" && <XCircle className="h-4 w-4" />}
                  <AlertDescription className="text-xs">
                    Linha {log.linha}: {log.mensagem}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
